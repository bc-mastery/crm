/** Business Canvas CRM — Activities page */

let ACTIVITIES_STATE = { activities: [], leads: [], filtered: [] };
const ACTIVITY_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

document.addEventListener("DOMContentLoaded", initializeActivitiesPage);

async function initializeActivitiesPage() {
  bindActivitiesUi();
  await loadActivitiesPageData();
}

function bindActivitiesUi() {
  document.getElementById("activitiesRefreshButton")?.addEventListener("click", loadActivitiesPageData);
  ["activitySearchInput","activityWeekFilter","activityStageFilter","activityUserFilter","activityTypeFilter","activityDirectionFilter","activityChannelFilter"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(id === "activitySearchInput" ? "input" : "change", applyActivityFilters);
  });
}

async function loadActivitiesPageData() {
  setActivitiesStatus("Loading activities...", "info");
  try {
    const [activities, leads] = await Promise.all([getCrmActivities(), getCrmLeads()]);
    ACTIVITIES_STATE.activities = Array.isArray(activities) ? activities : [];
    ACTIVITIES_STATE.leads = Array.isArray(leads) ? leads : [];
    populateActivityFilters();
    applyActivityFilters();
    hideActivitiesStatus();
  } catch (error) {
    console.error(error);
    setActivitiesStatus("The Activities page is ready, but the CRM backend still needs the listActivities API action before activity data can load.", "error");
  }
}

function populateActivityFilters() {
  populateSelect("activityTypeFilter", uniqueValues(ACTIVITIES_STATE.activities, "Activity_type"), "All activity types");
  populateSelect("activityDirectionFilter", uniqueValues(ACTIVITIES_STATE.activities, "Direction"), "All directions");
  populateSelect("activityChannelFilter", uniqueValues(ACTIVITIES_STATE.activities, "Channel"), "All channels");
  populateSelect("activityStageFilter", uniqueValues(ACTIVITIES_STATE.leads, "Pipeline_stage"), "All pipeline stages");
  populateUserFilter();
  populateWeekFilter();
}

function populateSelect(id, values, allLabel) {
  const select = document.getElementById(id);
  if (!select) return;
  const current = select.value;
  select.innerHTML = "";
  const all = document.createElement("option");
  all.value = "";
  all.textContent = allLabel;
  select.appendChild(all);
  values.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = prettify(value);
    select.appendChild(option);
  });
  if ([...select.options].some(o => o.value === current)) select.value = current;
}

function populateUserFilter() {
  const select = document.getElementById("activityUserFilter");
  if (!select) return;
  const current = select.value;
  const users = uniqueValues(ACTIVITIES_STATE.activities, "Created_by");
  select.innerHTML = "";
  const all = document.createElement("option");
  all.value = "";
  all.textContent = "All users";
  select.appendChild(all);
  users.forEach(user => {
    const option = document.createElement("option");
    option.value = user;
    option.textContent = user;
    select.appendChild(option);
  });
  if ([...select.options].some(o => o.value === current)) select.value = current;
}

function populateWeekFilter() {
  const select = document.getElementById("activityWeekFilter");
  if (!select) return;
  const current = select.value || "all";
  const weeks = new Map();
  ACTIVITIES_STATE.activities.forEach(activity => {
    const date = parseActivityDate(activity.Created_at);
    if (!date) return;
    const monday = getMonday(date);
    weeks.set(dateKey(monday), monday);
  });
  select.innerHTML = '<option value="all">All time</option>';
  [...weeks.values()].sort((a,b) => b-a).forEach(monday => {
    const sunday = new Date(monday.getTime() + 6 * 86400000);
    const option = document.createElement("option");
    option.value = dateKey(monday);
    option.textContent = `${formatShortDate(monday)} – ${formatShortDate(sunday)}`;
    select.appendChild(option);
  });
  if ([...select.options].some(o => o.value === current)) select.value = current;
}

function applyActivityFilters() {
  const search = (document.getElementById("activitySearchInput")?.value || "").trim().toLowerCase();
  const week = document.getElementById("activityWeekFilter")?.value || "all";
  const stage = document.getElementById("activityStageFilter")?.value || "";
  const user = document.getElementById("activityUserFilter")?.value || "";
  const type = document.getElementById("activityTypeFilter")?.value || "";
  const direction = document.getElementById("activityDirectionFilter")?.value || "";
  const channel = document.getElementById("activityChannelFilter")?.value || "";
  const leadMap = new Map(ACTIVITIES_STATE.leads.map(lead => [String(lead.Lead_id || ""), lead]));

  let weekStart = null, weekEnd = null;
  if (week !== "all") {
    weekStart = new Date(`${week}T00:00:00`);
    weekEnd = new Date(weekStart.getTime() + ACTIVITY_WEEK_MS);
  }

  ACTIVITIES_STATE.filtered = ACTIVITIES_STATE.activities.filter(activity => {
    const lead = leadMap.get(String(activity.Lead_id || "")) || {};
    const createdAt = parseActivityDate(activity.Created_at);
    if (weekStart && (!createdAt || createdAt < weekStart || createdAt >= weekEnd)) return false;
    if (stage && String(lead.Pipeline_stage || "") !== stage) return false;
    if (user && String(activity.Created_by || "") !== user) return false;
    if (type && String(activity.Activity_type || "") !== type) return false;
    if (direction && String(activity.Direction || "") !== direction) return false;
    if (channel && String(activity.Channel || "") !== channel) return false;
    if (search) {
      const haystack = [activity.Activity_id, activity.Lead_id, activity.Contact_name, activity.Content, activity.Created_by, activity.Activity_type, activity.Channel, lead.Company, lead.Company_name, lead.Founder_name].join(" ").toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  }).sort((a,b) => (parseActivityDate(b.Created_at)?.getTime() || 0) - (parseActivityDate(a.Created_at)?.getTime() || 0));

  renderActivitySummary();
  renderActivityTable(leadMap);
  renderActivityRangeLabel(weekStart);
}

function renderActivitySummary() {
  const list = ACTIVITIES_STATE.filtered;
  document.getElementById("activityTotal").textContent = list.length;
  document.getElementById("activityOutbound").textContent = list.filter(a => String(a.Direction || "").toUpperCase() === "OUTBOUND").length;
  document.getElementById("activityInbound").textContent = list.filter(a => String(a.Direction || "").toUpperCase() === "INBOUND").length;
  document.getElementById("activityLeadCount").textContent = new Set(list.map(a => a.Lead_id).filter(Boolean)).size;
  document.getElementById("activityCount").textContent = `${list.length} ${list.length === 1 ? "activity" : "activities"}`;
}

function renderActivityTable(leadMap) {
  const body = document.getElementById("activitiesTableBody");
  const empty = document.getElementById("activitiesEmptyState");
  if (!body || !empty) return;
  body.innerHTML = "";
  empty.hidden = ACTIVITIES_STATE.filtered.length > 0;

  ACTIVITIES_STATE.filtered.forEach(activity => {
    const lead = leadMap.get(String(activity.Lead_id || "")) || {};
    const company = lead.Company || lead.Company_name || activity.Lead_id || "—";
    const href = activity.Lead_id ? `lead.html?lead=${encodeURIComponent(activity.Lead_id)}` : "#";
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="activity-date">${escapeHtml(formatActivityDate(activity.Created_at))}</td>
      <td><a class="activity-lead-link" href="${href}">${escapeHtml(company)}</a><div class="activity-muted">${escapeHtml(activity.Lead_id || "")}</div></td>
      <td>${escapeHtml(activity.Contact_name || "—")}</td>
      <td><span class="activity-pill">${escapeHtml(prettify(activity.Activity_type || "—"))}</span></td>
      <td><span class="activity-pill ${String(activity.Direction || "").toLowerCase()}">${escapeHtml(prettify(activity.Direction || "—"))}</span></td>
      <td>${escapeHtml(prettify(activity.Channel || "—"))}</td>
      <td class="activity-content-cell">${escapeHtml(activity.Content || "—")}</td>
      <td>${escapeHtml(activity.Created_by || "—")}</td>`;
    body.appendChild(row);
  });
}

function renderActivityRangeLabel(weekStart) {
  const label = document.getElementById("activityRangeLabel");
  if (!label) return;
  if (!weekStart) return void (label.textContent = "All time");
  const sunday = new Date(weekStart.getTime() + 6 * 86400000);
  label.textContent = `Week: ${formatShortDate(weekStart)} – ${formatShortDate(sunday)}`;
}

function uniqueValues(rows, key) { return [...new Set(rows.map(r => String(r[key] || "").trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b)); }
function getMonday(date) { const d = new Date(date); d.setHours(0,0,0,0); const day = d.getDay(); d.setDate(d.getDate() + (day === 0 ? -6 : 1-day)); return d; }
function dateKey(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
function parseActivityDate(value) { if (!value) return null; const d = value instanceof Date ? value : new Date(value); return Number.isNaN(d.getTime()) ? null : d; }
function formatActivityDate(value) { const d = parseActivityDate(value); return d ? new Intl.DateTimeFormat("en-GB", {day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(d) : "—"; }
function formatShortDate(date) { return new Intl.DateTimeFormat("en-GB", {day:"2-digit",month:"short",year:"numeric"}).format(date); }
function prettify(value) { return String(value || "").replace(/_/g," ").replace(/\b\w/g, c => c.toUpperCase()); }
function escapeHtml(value) { return String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"); }
function setActivitiesStatus(message, type="info") { const panel = document.getElementById("activitiesStatusPanel"); if (!panel) return; panel.textContent = message; panel.className = `status-panel ${type}`; panel.hidden = false; }
function hideActivitiesStatus() { const panel = document.getElementById("activitiesStatusPanel"); if (panel) panel.hidden = true; }
