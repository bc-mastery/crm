/** Business Canvas CRM — Tasks page */

let TASKS_STATE = { tasks: [], leads: [], meta: null, filtered: [] };

document.addEventListener("DOMContentLoaded", initializeTasksPage);

async function initializeTasksPage() {
  bindTasksUi();
  await loadTasksPageData();
}

function bindTasksUi() {
  document.getElementById("tasksRefreshButton")?.addEventListener("click", loadTasksPageData);
  ["taskSearchInput","taskDueFilter","taskStatusFilter","taskUserFilter","taskTypeFilter","taskStageFilter"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(id === "taskSearchInput" ? "input" : "change", applyTaskFilters);
  });
  document.getElementById("newTaskButton")?.addEventListener("click", openTaskDialog);
  document.getElementById("taskDialogClose")?.addEventListener("click", closeTaskDialog);
  document.getElementById("taskDialogCancel")?.addEventListener("click", closeTaskDialog);
  document.getElementById("taskForm")?.addEventListener("submit", submitManualTask);
}

async function loadTasksPageData() {
  setTasksStatus("Loading tasks...", "info");
  try {
    const [tasks, leads, meta] = await Promise.all([getCrmTasks(), getCrmLeads(), getCrmMeta()]);
    TASKS_STATE.tasks = Array.isArray(tasks) ? tasks : [];
    TASKS_STATE.leads = Array.isArray(leads) ? leads : [];
    TASKS_STATE.meta = meta || null;
    populateTaskFilters();
    populateTaskDialogOptions();
    applyTaskFilters();
    hideTasksStatus();
  } catch (error) {
    console.error(error);
    setTasksStatus("The Tasks page is ready, but the CRM backend still needs the Tasks API actions before task data can load.", "error");
  }
}

function populateTaskFilters() {
  populateTaskSelect("taskStatusFilter", uniqueTaskValues(TASKS_STATE.tasks,"Status"), "All statuses");
  populateTaskSelect("taskTypeFilter", uniqueTaskValues(TASKS_STATE.tasks,"Task_type"), "All task types");
  populateTaskSelect("taskStageFilter", uniqueTaskValues(TASKS_STATE.leads,"Pipeline_stage"), "All pipeline stages");
  const users = TASKS_STATE.meta?.responsibleUsers || [];
  const userSelect = document.getElementById("taskUserFilter");
  if (userSelect) {
    const current = userSelect.value;
    userSelect.innerHTML = '<option value="">All users</option>';
    users.forEach(user => {
      const o = document.createElement("option");
      o.value = user.email;
      o.textContent = user.name || user.email;
      userSelect.appendChild(o);
    });
    if ([...userSelect.options].some(o => o.value === current)) userSelect.value = current;
  }
}

function populateTaskSelect(id, values, allLabel) {
  const select = document.getElementById(id);
  if (!select) return;
  const current = select.value;
  select.innerHTML = "";
  const all = document.createElement("option");
  all.value = "";
  all.textContent = allLabel;
  select.appendChild(all);
  values.forEach(value => {
    const o = document.createElement("option");
    o.value = value;
    o.textContent = prettifyTask(value);
    select.appendChild(o);
  });
  if ([...select.options].some(o => o.value === current)) select.value = current;
}

function populateTaskDialogOptions() {
  const leadSelect = document.getElementById("taskLeadInput");
  if (leadSelect) {
    leadSelect.innerHTML = '<option value="">Select lead</option>';
    [...TASKS_STATE.leads].sort((a,b) => String(a.Company_name||"").localeCompare(String(b.Company_name||""))).forEach(lead => {
      const o = document.createElement("option");
      o.value = lead.Lead_id;
      o.textContent = `${lead.Company_name || lead.Lead_id}${lead.Founder_1_name ? ` — ${lead.Founder_1_name}` : ""}`;
      leadSelect.appendChild(o);
    });
  }
  const typeSelect = document.getElementById("taskTypeInput");
  if (typeSelect) {
    const values = [...new Set(["CHECK_CONNECTION","SEND_MESSAGE","FOLLOW_UP","CONTINUE_CONVERSATION","FOLLOW_UP_REVIEW_CALL","SEND_GS","CHECK_GS","PREPARE_REVIEW_CALL","SEND_POST_CALL","FOLLOW_UP_PROPOSAL","ONBOARDING","OTHER",...uniqueTaskValues(TASKS_STATE.tasks,"Task_type")])];
    typeSelect.innerHTML = "";
    values.forEach(value => { const o=document.createElement("option"); o.value=value; o.textContent=prettifyTask(value); typeSelect.appendChild(o); });
    typeSelect.value = "OTHER";
  }
  const userSelect = document.getElementById("taskUserInput");
  if (userSelect) {
    const users = TASKS_STATE.meta?.responsibleUsers || [];
    userSelect.innerHTML = '<option value="">Select user</option>';
    users.forEach(user => { const o=document.createElement("option"); o.value=user.email; o.textContent=user.name || user.email; userSelect.appendChild(o); });
    const currentUser = TASKS_STATE.meta?.user?.email;
    if (currentUser && [...userSelect.options].some(o => o.value === currentUser)) userSelect.value = currentUser;
  }
}

function applyTaskFilters() {
  const search = (document.getElementById("taskSearchInput")?.value || "").trim().toLowerCase();
  const due = document.getElementById("taskDueFilter")?.value || "open";
  const status = document.getElementById("taskStatusFilter")?.value || "";
  const user = document.getElementById("taskUserFilter")?.value || "";
  const type = document.getElementById("taskTypeFilter")?.value || "";
  const stage = document.getElementById("taskStageFilter")?.value || "";
  const leadMap = new Map(TASKS_STATE.leads.map(lead => [String(lead.Lead_id || ""), lead]));
  const todayStart = startOfToday();
  const tomorrowStart = new Date(todayStart.getTime() + 86400000);

  TASKS_STATE.filtered = TASKS_STATE.tasks.filter(task => {
    const lead = leadMap.get(String(task.Lead_id || "")) || {};
    const taskStatus = String(task.Status || "").toUpperCase();
    const dueAt = parseTaskDate(task.Due_at);
    if (due === "open" && taskStatus !== "OPEN") return false;
    if (due === "overdue" && (taskStatus !== "OPEN" || !dueAt || dueAt >= todayStart)) return false;
    if (due === "today" && (taskStatus !== "OPEN" || !dueAt || dueAt < todayStart || dueAt >= tomorrowStart)) return false;
    if (due === "upcoming" && (taskStatus !== "OPEN" || !dueAt || dueAt < tomorrowStart)) return false;
    if (status && taskStatus !== status.toUpperCase()) return false;
    if (user && String(task.Responsible_email || "").toLowerCase() !== user.toLowerCase()) return false;
    if (type && String(task.Task_type || "") !== type) return false;
    if (stage && String(lead.Pipeline_stage || task.Pipeline_stage || "") !== stage) return false;
    if (search) {
      const haystack = [task.Task_id,task.Lead_id,task.Task_title,task.Task_type,task.Notes,task.Responsible_email,lead.Company_name,lead.Founder_1_name].join(" ").toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  }).sort(compareTasks);

  renderTaskSummary();
  renderTasksTable(leadMap);
  renderTaskRangeLabel(due);
}

function compareTasks(a,b) {
  const statusA = String(a.Status||"").toUpperCase();
  const statusB = String(b.Status||"").toUpperCase();
  if (statusA === "OPEN" && statusB !== "OPEN") return -1;
  if (statusA !== "OPEN" && statusB === "OPEN") return 1;
  return (parseTaskDate(a.Due_at)?.getTime() || Number.MAX_SAFE_INTEGER) - (parseTaskDate(b.Due_at)?.getTime() || Number.MAX_SAFE_INTEGER);
}

function renderTaskSummary() {
  const todayStart = startOfToday();
  const tomorrowStart = new Date(todayStart.getTime() + 86400000);
  const open = TASKS_STATE.tasks.filter(t => String(t.Status||"").toUpperCase() === "OPEN");
  document.getElementById("taskOverdue").textContent = open.filter(t => { const d=parseTaskDate(t.Due_at); return d && d < todayStart; }).length;
  document.getElementById("taskToday").textContent = open.filter(t => { const d=parseTaskDate(t.Due_at); return d && d >= todayStart && d < tomorrowStart; }).length;
  document.getElementById("taskUpcoming").textContent = open.filter(t => { const d=parseTaskDate(t.Due_at); return d && d >= tomorrowStart; }).length;
  document.getElementById("taskCompleted").textContent = TASKS_STATE.tasks.filter(t => String(t.Status||"").toUpperCase() === "DONE").length;
  document.getElementById("taskCount").textContent = `${TASKS_STATE.filtered.length} ${TASKS_STATE.filtered.length === 1 ? "task" : "tasks"}`;
}

function renderTasksTable(leadMap) {
  const body = document.getElementById("tasksTableBody");
  const empty = document.getElementById("tasksEmptyState");
  if (!body || !empty) return;
  body.innerHTML = "";
  empty.hidden = TASKS_STATE.filtered.length > 0;
  const todayStart = startOfToday();

  TASKS_STATE.filtered.forEach(task => {
    const lead = leadMap.get(String(task.Lead_id || "")) || {};
    const company = lead.Company_name || task.Company_name || task.Lead_id || "—";
    const stage = lead.Pipeline_stage || task.Pipeline_stage || "—";
    const status = String(task.Status || "—").toUpperCase();
    const dueAt = parseTaskDate(task.Due_at);
    const overdue = status === "OPEN" && dueAt && dueAt < todayStart;
    const href = task.Lead_id ? `lead.html?lead=${encodeURIComponent(task.Lead_id)}` : "#";
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="task-due ${overdue ? "overdue" : ""}">${escapeTaskHtml(formatTaskDate(task.Due_at))}</td>
      <td><a class="task-lead-link" href="${href}">${escapeTaskHtml(company)}</a><div class="task-muted">${escapeTaskHtml(task.Lead_id || "")}</div></td>
      <td class="task-title-cell">${escapeTaskHtml(task.Task_title || "—")}${task.Notes ? `<div class="task-muted">${escapeTaskHtml(task.Notes)}</div>` : ""}</td>
      <td><span class="task-pill">${escapeTaskHtml(prettifyTask(task.Task_type || "—"))}</span></td>
      <td>${escapeTaskHtml(prettifyTask(stage))}</td>
      <td>${escapeTaskHtml(task.Responsible_name || task.Responsible_email || "—")}</td>
      <td><span class="task-pill ${status.toLowerCase()}">${escapeTaskHtml(prettifyTask(status))}</span></td>
      <td class="${task.Auto_created ? "task-source-auto" : ""}">${task.Auto_created ? "Automatic" : "Manual"}</td>
      <td class="task-actions">${status === "OPEN" ? `<button class="task-action-button complete" data-task-action="DONE" data-task-id="${escapeTaskHtml(task.Task_id)}">Complete</button><button class="task-action-button cancel" data-task-action="CANCELLED" data-task-id="${escapeTaskHtml(task.Task_id)}">Cancel</button>` : "—"}</td>`;
    body.appendChild(row);
  });

  body.querySelectorAll("[data-task-action]").forEach(button => button.addEventListener("click", () => changeTaskStatus(button.dataset.taskId, button.dataset.taskAction)));
}

async function changeTaskStatus(taskId, status) {
  if (!taskId) return;
  try {
    setTasksStatus(status === "DONE" ? "Completing task..." : "Cancelling task...", "info");
    const updated = await setCrmTaskStatus(taskId, status);
    TASKS_STATE.tasks = TASKS_STATE.tasks.map(task => task.Task_id === taskId ? updated : task);
    applyTaskFilters();
    hideTasksStatus();
  } catch (error) {
    console.error(error);
    setTasksStatus(error.message || "Could not update task.", "error");
  }
}

function renderTaskRangeLabel(value) {
  const labels = {open:"Open tasks",overdue:"Overdue",today:"Due today",upcoming:"Upcoming",all:"All dates"};
  const label = document.getElementById("taskRangeLabel");
  if (label) label.textContent = labels[value] || "Tasks";
}

function openTaskDialog() {
  const dialog = document.getElementById("taskDialog");
  const due = document.getElementById("taskDueInput");
  if (due && !due.value) {
    const tomorrow = new Date(Date.now() + 86400000);
    tomorrow.setHours(9,0,0,0);
    due.value = toLocalTaskInput(tomorrow);
  }
  dialog?.showModal();
}
function closeTaskDialog() { document.getElementById("taskDialog")?.close(); }

async function submitManualTask(event) {
  event.preventDefault();
  const leadId = document.getElementById("taskLeadInput")?.value || "";
  const taskType = document.getElementById("taskTypeInput")?.value || "OTHER";
  const taskTitle = (document.getElementById("taskTitleInput")?.value || "").trim();
  const dueAt = document.getElementById("taskDueInput")?.value || "";
  const responsibleEmail = document.getElementById("taskUserInput")?.value || "";
  const notes = (document.getElementById("taskNotesInput")?.value || "").trim();
  if (!leadId || !taskTitle || !dueAt || !responsibleEmail) return;
  try {
    setTasksStatus("Creating task...", "info");
    const created = await createCrmTask({leadId,taskType,taskTitle,dueAt,responsibleEmail,notes});
    TASKS_STATE.tasks.push(created);
    document.getElementById("taskForm")?.reset();
    populateTaskDialogOptions();
    closeTaskDialog();
    applyTaskFilters();
    hideTasksStatus();
  } catch (error) {
    console.error(error);
    setTasksStatus(error.message || "Could not create task.", "error");
  }
}

function uniqueTaskValues(rows,key){return [...new Set(rows.map(r=>String(r[key]||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));}
function startOfToday(){const d=new Date();d.setHours(0,0,0,0);return d;}
function parseTaskDate(value){if(!value)return null;const d=value instanceof Date?value:new Date(value);return Number.isNaN(d.getTime())?null:d;}
function formatTaskDate(value){const d=parseTaskDate(value);return d?new Intl.DateTimeFormat("en-GB",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(d):"—";}
function toLocalTaskInput(date){const p=n=>String(n).padStart(2,"0");return `${date.getFullYear()}-${p(date.getMonth()+1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;}
function prettifyTask(value){return String(value||"").replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());}
function escapeTaskHtml(value){return String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");}
function setTasksStatus(message,type="info"){const panel=document.getElementById("tasksStatusPanel");if(!panel)return;panel.textContent=message;panel.className=`status-panel ${type}`;panel.hidden=false;}
function hideTasksStatus(){const panel=document.getElementById("tasksStatusPanel");if(panel)panel.hidden=true;}
