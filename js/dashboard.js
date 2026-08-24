/**
 * Business Canvas CRM
 * Dashboard
 */

const DASHBOARD_STATE = {
  leads: [],
  tasks: [],
  meta: null,
  filteredLeads: [],
  filteredTasks: []
};

const DASHBOARD_FUNNEL_STAGES = [
  { key: "researched", label: "Researched", test: lead => ["DONE", "PARTIAL"].includes(String(lead.Research_status || "").toUpperCase()) },
  { key: "connection_requested", label: "Connection requested", test: lead => hasLeadMilestone_(lead, "Connection_request_sent", "CR") },
  { key: "connected", label: "Connected", test: lead => hasLeadMilestone_(lead, "Connection_accepted", "CA") },
  { key: "message_sent", label: "Message sent", test: lead => hasLeadMilestone_(lead, "Message_sent", "MS") },
  { key: "responded", label: "Responded", test: lead => hasLeadMilestone_(lead, "Response_time", "RT") },
  { key: "review_booked", label: "Review booked", test: lead => hasLeadMilestone_(lead, "RC_booked_time", "Review Call Booked") },
  { key: "review_done", label: "Review done", test: lead => hasLeadMilestone_(lead, "RC_done_time", "Review Call Done") },
  { key: "proposal", label: "Proposal sent", test: lead => hasLeadMilestone_(lead, "Proposal_time", "Proposal Sent") },
  { key: "won", label: "Won", test: lead => hasLeadMilestone_(lead, "Won_time", "Won") }
];

const DASHBOARD_PIPELINE_ORDER = [
  "RESEARCHED",
  "CONNECTION_REQUESTED",
  "CONNECTED",
  "MESSAGE_SENT",
  "RESPONDED",
  "REVIEW_CALL_OFFERED",
  "REVIEW_CALL_BOOKED",
  "GS_SENT",
  "GS_COMPLETED",
  "REVIEW_CALL_DONE",
  "PROPOSAL_SENT"
];

document.addEventListener("DOMContentLoaded", initializeDashboard);

async function initializeDashboard() {
  bindDashboardEvents_();
  await loadDashboardData_();
}

function bindDashboardEvents_() {
  document.getElementById("dashboardRefreshButton")?.addEventListener("click", loadDashboardData_);
  document.getElementById("dashboardUserFilter")?.addEventListener("change", applyDashboardFilters_);
  document.getElementById("dashboardPeriodFilter")?.addEventListener("change", applyDashboardFilters_);
}

async function loadDashboardData_() {
  setDashboardStatus_("Loading dashboard…", "info");

  try {
    const [leadsResult, metaResult, tasksResult] = await Promise.allSettled([
      getCrmLeads(),
      getCrmMeta(),
      getCrmTasks()
    ]);

    if (leadsResult.status !== "fulfilled") {
      throw leadsResult.reason;
    }

    DASHBOARD_STATE.leads = leadsResult.value || [];
    DASHBOARD_STATE.meta = metaResult.status === "fulfilled" ? metaResult.value : null;
    DASHBOARD_STATE.tasks = tasksResult.status === "fulfilled" ? (tasksResult.value || []) : [];

    populateDashboardUsers_();
    applyDashboardFilters_();

    if (tasksResult.status !== "fulfilled") {
      setDashboardStatus_("Dashboard loaded, but task data is temporarily unavailable.", "warning");
    } else {
      clearDashboardStatus_();
    }
  } catch (error) {
    console.error(error);
    setDashboardStatus_("Could not load dashboard: " + (error?.message || String(error)), "error");
  }
}

function populateDashboardUsers_() {
  const select = document.getElementById("dashboardUserFilter");
  if (!select) return;

  const currentValue = select.value;
  const users = DASHBOARD_STATE.meta?.responsibleUsers || [];

  select.innerHTML = '<option value="">All users</option>' + users.map(user => {
    const email = escapeDashboardHtml_(user.email || "");
    const label = escapeDashboardHtml_(user.name || user.email || "Unknown");
    return `<option value="${email}">${label}</option>`;
  }).join("");

  if ([...select.options].some(option => option.value === currentValue)) {
    select.value = currentValue;
  }
}

function applyDashboardFilters_() {
  const userEmail = String(document.getElementById("dashboardUserFilter")?.value || "").trim().toLowerCase();
  const periodKey = String(document.getElementById("dashboardPeriodFilter")?.value || "overall");
  const range = getDashboardPeriodRange_(periodKey);

  DASHBOARD_STATE.filteredLeads = DASHBOARD_STATE.leads.filter(lead => {
    if (userEmail && String(lead.Responsible_email || "").trim().toLowerCase() !== userEmail) {
      return false;
    }

    if (!range) {
      return true;
    }

    const createdAt = parseDashboardDate_(lead.Company_lead);
    if (!createdAt) {
      return false;
    }

    return createdAt >= range.start && createdAt < range.end;
  });

  const leadIds = new Set(DASHBOARD_STATE.filteredLeads.map(lead => String(lead.Lead_id || "").trim()).filter(Boolean));

  DASHBOARD_STATE.filteredTasks = DASHBOARD_STATE.tasks.filter(task => {
    const leadId = String(task.Lead_id || "").trim();
    if (!leadIds.has(leadId)) return false;
    if (userEmail && String(task.Responsible_email || "").trim().toLowerCase() !== userEmail) return false;
    return true;
  });

  const periodLabel = document.getElementById("dashboardPeriodLabel");
  if (periodLabel) periodLabel.textContent = getDashboardPeriodLabel_(periodKey, range);

  renderDashboard_();
}

function renderDashboard_() {
  const leads = DASHBOARD_STATE.filteredLeads;
  const tasks = DASHBOARD_STATE.filteredTasks;
  const funnel = buildDashboardFunnel_(leads);

  renderDashboardKpis_(leads, tasks, funnel);
  renderDashboardFunnel_(funnel);
  renderDashboardPipeline_(leads);
  renderDashboardConversions_(funnel);
  renderDashboardAttention_(tasks);
  renderDashboardCoverage_(leads, tasks);
  renderDashboardMix_("dashboardIcpMix", leads, lead => String(lead.ICP_fit_level || "UNSET").toUpperCase(), ["HIGH", "MEDIUM", "LOW", "REJECT", "UNSET"]);
  renderDashboardMix_("dashboardSourceMix", leads, lead => String(lead.Lead_source || "UNSET").toUpperCase(), ["CLUTCH", "GOODFIRMS", "UNSET"]);
}

function renderDashboardKpis_(leads, tasks, funnel) {
  const activeLeads = leads.filter(isDashboardActiveLead_);
  const messages = funnel.find(item => item.key === "message_sent")?.count || 0;
  const responses = funnel.find(item => item.key === "responded")?.count || 0;
  const booked = funnel.find(item => item.key === "review_booked")?.count || 0;
  const reviewDone = funnel.find(item => item.key === "review_done")?.count || 0;
  const proposals = funnel.find(item => item.key === "proposal")?.count || 0;
  const won = funnel.find(item => item.key === "won")?.count || 0;

  setDashboardText_("dashboardLeadCount", leads.length);
  setDashboardText_("dashboardActiveCount", `${activeLeads.length} active`);
  setDashboardText_("dashboardResponseRate", formatDashboardPercent_(responses, messages));
  setDashboardText_("dashboardResponseDetail", `${responses} responses from ${messages} messages`);
  setDashboardText_("dashboardReviewRate", formatDashboardPercent_(booked, responses));
  setDashboardText_("dashboardReviewDetail", `${booked} booked from ${responses} responses`);
  setDashboardText_("dashboardProposalRate", formatDashboardPercent_(proposals, reviewDone));
  setDashboardText_("dashboardProposalDetail", `${proposals} proposals from ${reviewDone} completed reviews`);
  setDashboardText_("dashboardWinRate", formatDashboardPercent_(won, proposals));
  setDashboardText_("dashboardWinDetail", `${won} won from ${proposals} proposals`);

  const openTasks = tasks.filter(task => String(task.Status || "").toUpperCase() === "OPEN");
  const overdueTasks = openTasks.filter(isDashboardTaskOverdue_);

  setDashboardText_("dashboardOpenTasks", openTasks.length);
  const overdueElement = document.getElementById("dashboardOverdueTasks");
  if (overdueElement) {
    overdueElement.textContent = `${overdueTasks.length} overdue`;
    overdueElement.classList.toggle("has-overdue", overdueTasks.length > 0);
  }
}

function buildDashboardFunnel_(leads) {
  return DASHBOARD_FUNNEL_STAGES.map((stage, index) => {
    const count = leads.filter(stage.test).length;
    const previousCount = index === 0 ? leads.length : null;
    return { ...stage, count, previousCount };
  });
}

function renderDashboardFunnel_(funnel) {
  const container = document.getElementById("dashboardFunnel");
  if (!container) return;

  if (!funnel.length || !DASHBOARD_STATE.filteredLeads.length) {
    container.innerHTML = '<div class="dashboard-empty">No leads match the selected filters.</div>';
    return;
  }

  const maxCount = Math.max(1, funnel[0]?.count || DASHBOARD_STATE.filteredLeads.length);

  container.innerHTML = funnel.map((item, index) => {
    const width = Math.max(2, (item.count / maxCount) * 100);
    const previous = index === 0 ? DASHBOARD_STATE.filteredLeads.length : funnel[index - 1].count;
    const rate = index === 0 ? formatDashboardPercent_(item.count, DASHBOARD_STATE.filteredLeads.length) : formatDashboardPercent_(item.count, previous);

    return `
      <div class="dashboard-funnel-row">
        <div class="dashboard-funnel-label">${escapeDashboardHtml_(item.label)}</div>
        <div class="dashboard-funnel-track"><div class="dashboard-funnel-fill" style="width:${width.toFixed(2)}%"></div></div>
        <div class="dashboard-funnel-count">${item.count}</div>
        <div class="dashboard-funnel-rate">${rate}</div>
      </div>`;
  }).join("");
}

function renderDashboardPipeline_(leads) {
  const container = document.getElementById("dashboardPipelineChart");
  if (!container) return;

  const activeLeads = leads.filter(isDashboardActiveLead_);
  if (!activeLeads.length) {
    container.innerHTML = '<div class="dashboard-empty">No active pipeline leads match the selected filters.</div>';
    return;
  }

  const counts = {};
  activeLeads.forEach(lead => {
    const stage = String(lead.Pipeline_stage || "UNSET").toUpperCase();
    counts[stage] = (counts[stage] || 0) + 1;
  });

  const known = DASHBOARD_PIPELINE_ORDER.filter(stage => counts[stage]);
  const extras = Object.keys(counts).filter(stage => !DASHBOARD_PIPELINE_ORDER.includes(stage)).sort();
  const stages = [...known, ...extras];
  const maxCount = Math.max(1, ...stages.map(stage => counts[stage] || 0));

  container.innerHTML = stages.map(stage => {
    const count = counts[stage] || 0;
    const height = Math.max(3, (count / maxCount) * 100);
    return `
      <div class="dashboard-pipeline-column">
        <div class="dashboard-pipeline-value">${count}</div>
        <div class="dashboard-pipeline-bar-wrap"><div class="dashboard-pipeline-bar" style="height:${height.toFixed(2)}%"></div></div>
        <div class="dashboard-pipeline-label">${escapeDashboardHtml_(formatDashboardLabel_(stage))}</div>
      </div>`;
  }).join("");
}

function renderDashboardConversions_(funnel) {
  const container = document.getElementById("dashboardConversionTable");
  if (!container) return;

  if (!DASHBOARD_STATE.filteredLeads.length) {
    container.innerHTML = '<div class="dashboard-empty">No conversion data for this selection.</div>';
    return;
  }

  container.innerHTML = funnel.slice(1).map((item, index) => {
    const previous = funnel[index];
    const rate = formatDashboardPercent_(item.count, previous.count);
    return `
      <div class="dashboard-conversion-row">
        <div class="dashboard-conversion-stage">${escapeDashboardHtml_(previous.label)} → ${escapeDashboardHtml_(item.label)}</div>
        <div class="dashboard-conversion-number">${previous.count}</div>
        <div class="dashboard-conversion-number">${item.count}</div>
        <div class="dashboard-conversion-rate">${rate}</div>
      </div>`;
  }).join("");
}

function renderDashboardAttention_(tasks) {
  const container = document.getElementById("dashboardAttentionList");
  if (!container) return;

  const openTasks = tasks
    .filter(task => String(task.Status || "").toUpperCase() === "OPEN")
    .sort(compareDashboardTasks_)
    .slice(0, 7);

  if (!openTasks.length) {
    container.innerHTML = '<div class="dashboard-empty">No open tasks for the selected cohort.</div>';
    return;
  }

  container.innerHTML = openTasks.map(task => {
    const overdue = isDashboardTaskOverdue_(task);
    const due = task.Due_at ? formatDashboardDate_(task.Due_at) : "No deadline";
    const company = task.Company_name || task.Lead_id || "Lead";
    const title = task.Task_title || formatDashboardLabel_(task.Task_type || "Task");
    const user = task.Responsible_name || task.Responsible_email || "";

    return `
      <div class="dashboard-attention-item ${overdue ? "overdue" : ""}">
        <div class="dashboard-attention-due">${overdue ? "OVERDUE · " : ""}${escapeDashboardHtml_(due)}</div>
        <div class="dashboard-attention-copy"><strong>${escapeDashboardHtml_(company)}</strong><span>${escapeDashboardHtml_(title)}</span></div>
        <div class="dashboard-attention-user">${escapeDashboardHtml_(user)}</div>
      </div>`;
  }).join("");
}

function renderDashboardCoverage_(leads, tasks) {
  const container = document.getElementById("dashboardCoverage");
  if (!container) return;

  const activeLeads = leads.filter(isDashboardActiveLead_);
  const openLeadIds = new Set(tasks
    .filter(task => String(task.Status || "").toUpperCase() === "OPEN")
    .map(task => String(task.Lead_id || "").trim())
    .filter(Boolean));

  const covered = activeLeads.filter(lead => openLeadIds.has(String(lead.Lead_id || "").trim())).length;
  const uncovered = Math.max(0, activeLeads.length - covered);
  const percent = activeLeads.length ? Math.round((covered / activeLeads.length) * 100) : 0;

  container.innerHTML = `
    <div class="dashboard-coverage-score"><strong>${percent}%</strong><span>${covered} of ${activeLeads.length} active leads</span></div>
    <div class="dashboard-progress-track"><div class="dashboard-progress-fill" style="width:${percent}%"></div></div>
    <div class="dashboard-coverage-warning">${uncovered ? `${uncovered} active lead${uncovered === 1 ? "" : "s"} currently have no open task.` : "Every active lead has a next action."}</div>`;
}

function renderDashboardMix_(elementId, leads, getter, preferredOrder) {
  const container = document.getElementById(elementId);
  if (!container) return;

  if (!leads.length) {
    container.innerHTML = '<div class="dashboard-empty">No data for this selection.</div>';
    return;
  }

  const counts = {};
  leads.forEach(lead => {
    const value = getter(lead) || "UNSET";
    counts[value] = (counts[value] || 0) + 1;
  });

  const keys = [
    ...preferredOrder.filter(key => counts[key]),
    ...Object.keys(counts).filter(key => !preferredOrder.includes(key)).sort()
  ];

  const maxCount = Math.max(1, ...keys.map(key => counts[key]));

  container.innerHTML = keys.map(key => {
    const count = counts[key];
    const width = Math.max(2, (count / maxCount) * 100);
    return `
      <div class="dashboard-mix-row">
        <div class="dashboard-mix-label">${escapeDashboardHtml_(formatDashboardLabel_(key))}</div>
        <div class="dashboard-mix-track"><div class="dashboard-mix-fill" style="width:${width.toFixed(2)}%"></div></div>
        <div class="dashboard-mix-value">${count}</div>
      </div>`;
  }).join("");
}

function getDashboardPeriodRange_(key) {
  if (key === "overall") return null;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (key === "this_week") {
    const day = startOfToday.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const start = new Date(startOfToday);
    start.setDate(start.getDate() - diff);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  }

  if (key === "last_4_weeks") {
    const start = new Date(startOfToday);
    start.setDate(start.getDate() - 27);
    const end = new Date(startOfToday);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  if (key === "this_month") {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 1)
    };
  }

  if (key === "last_month") {
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      end: new Date(now.getFullYear(), now.getMonth(), 1)
    };
  }

  if (key === "this_quarter") {
    const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
    return {
      start: new Date(now.getFullYear(), quarterMonth, 1),
      end: new Date(now.getFullYear(), quarterMonth + 3, 1)
    };
  }

  if (key === "this_year") {
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear() + 1, 0, 1)
    };
  }

  return null;
}

function getDashboardPeriodLabel_(key, range) {
  if (!range) return "Overall";

  const labels = {
    this_week: "This week",
    last_4_weeks: "Last 4 weeks",
    this_month: "This month",
    last_month: "Last month",
    this_quarter: "This quarter",
    this_year: "This year"
  };

  return labels[key] || `${formatDashboardDate_(range.start)} – ${formatDashboardDate_(new Date(range.end.getTime() - 1))}`;
}

function hasLeadMilestone_(lead, timestampField, checkboxField) {
  if (lead?.[timestampField]) return true;
  return normalizeDashboardBoolean_(lead?.[checkboxField]);
}

function isDashboardActiveLead_(lead) {
  if (normalizeDashboardBoolean_(lead.Is_archived)) return false;
  const stage = String(lead.Pipeline_stage || "").toUpperCase();
  if (["WON", "LOST", "ARCHIVED"].includes(stage)) return false;
  return true;
}

function isDashboardTaskOverdue_(task) {
  if (String(task.Status || "").toUpperCase() !== "OPEN") return false;
  const due = parseDashboardDate_(task.Due_at);
  if (!due) return false;
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return due < startOfToday;
}

function compareDashboardTasks_(a, b) {
  const aDue = parseDashboardDate_(a.Due_at);
  const bDue = parseDashboardDate_(b.Due_at);

  if (aDue && bDue) return aDue - bDue;
  if (aDue) return -1;
  if (bDue) return 1;

  const aCreated = parseDashboardDate_(a.Created_at);
  const bCreated = parseDashboardDate_(b.Created_at);
  return (aCreated?.getTime() || 0) - (bCreated?.getTime() || 0);
}

function parseDashboardDate_(value) {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value.getTime())) return value;

  const text = String(value).trim();
  if (!text) return null;

  const parsed = new Date(text);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function formatDashboardDate_(value) {
  const date = value instanceof Date ? value : parseDashboardDate_(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatDashboardPercent_(numerator, denominator) {
  if (!denominator) return "—";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function formatDashboardLabel_(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase());
}

function normalizeDashboardBoolean_(value) {
  if (value === true || value === false) return value;
  return ["TRUE", "YES", "1"].includes(String(value || "").trim().toUpperCase());
}

function setDashboardText_(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = String(value ?? "");
}

function setDashboardStatus_(message, type) {
  const panel = document.getElementById("dashboardStatusPanel");
  if (!panel) return;
  panel.hidden = false;
  panel.textContent = message;
  panel.className = `status-panel ${type || "info"}`;
}

function clearDashboardStatus_() {
  const panel = document.getElementById("dashboardStatusPanel");
  if (!panel) return;
  panel.hidden = true;
  panel.textContent = "";
  panel.className = "status-panel";
}

function escapeDashboardHtml_(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
