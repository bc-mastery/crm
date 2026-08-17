/** Business Canvas CRM — Lead Profile activity feed */

const LEAD_ACTIVITY_STATE = {
  activities: null,
  loadingPromise: null,
  renderedLeadId: null,
  requestToken: 0
};

document.addEventListener("DOMContentLoaded", initializeLeadActivityFeed);

function initializeLeadActivityFeed() {
  const detail = document.getElementById("leadProfileDetail");
  if (!detail) return;

  loadLeadActivityFeedForCurrentLead();

  let timer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(loadLeadActivityFeedForCurrentLead, 50);
  });

  observer.observe(detail, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

function getCurrentLeadActivityId() {
  const params = new URLSearchParams(window.location.search);
  return String(params.get("lead") || "").trim();
}

async function ensureLeadActivitiesLoaded() {
  if (Array.isArray(LEAD_ACTIVITY_STATE.activities)) {
    return LEAD_ACTIVITY_STATE.activities;
  }

  if (LEAD_ACTIVITY_STATE.loadingPromise) {
    return LEAD_ACTIVITY_STATE.loadingPromise;
  }

  LEAD_ACTIVITY_STATE.loadingPromise = getCrmActivities()
    .then(activities => {
      LEAD_ACTIVITY_STATE.activities = Array.isArray(activities) ? activities : [];
      return LEAD_ACTIVITY_STATE.activities;
    })
    .finally(() => {
      LEAD_ACTIVITY_STATE.loadingPromise = null;
    });

  return LEAD_ACTIVITY_STATE.loadingPromise;
}

async function loadLeadActivityFeedForCurrentLead() {
  const leadId = getCurrentLeadActivityId();

  if (!leadId) {
    renderLeadActivityEmpty("No lead selected", "Select a lead to view its activity history.");
    LEAD_ACTIVITY_STATE.renderedLeadId = null;
    return;
  }

  if (LEAD_ACTIVITY_STATE.renderedLeadId === leadId && Array.isArray(LEAD_ACTIVITY_STATE.activities)) {
    renderLeadActivitiesForLead(leadId, LEAD_ACTIVITY_STATE.activities);
    return;
  }

  const requestToken = ++LEAD_ACTIVITY_STATE.requestToken;
  renderLeadActivityLoading();

  try {
    const activities = await ensureLeadActivitiesLoaded();
    if (requestToken !== LEAD_ACTIVITY_STATE.requestToken) return;

    LEAD_ACTIVITY_STATE.renderedLeadId = leadId;
    renderLeadActivitiesForLead(leadId, activities);
  } catch (error) {
    console.error("Could not load Lead Profile activities.", error);
    renderLeadActivityError();
  }
}

function renderLeadActivitiesForLead(leadId, activities) {
  const filtered = activities
    .filter(activity => String(activity.Lead_id || "").trim() === leadId)
    .sort((a, b) => leadActivityTime(b.Created_at) - leadActivityTime(a.Created_at));

  const count = document.getElementById("leadProfileActivityCount");
  const body = document.getElementById("leadProfileActivityBody");

  if (!body) return;

  if (count) {
    count.textContent = `${filtered.length} ${filtered.length === 1 ? "activity" : "activities"}`;
  }

  if (!filtered.length) {
    renderLeadActivityEmpty("No activity yet", "New CRM activities for this lead will appear here automatically.");
    return;
  }

  body.innerHTML = filtered.map(activity => {
    const direction = String(activity.Direction || "").trim();
    const channel = String(activity.Channel || "").trim();
    const type = prettifyLeadActivity(activity.Activity_type || "Activity");
    const meta = [direction && prettifyLeadActivity(direction), channel && prettifyLeadActivity(channel)]
      .filter(Boolean)
      .join(" · ");

    return `
      <article class="lead-activity-item">
        <div class="lead-activity-marker" aria-hidden="true"></div>
        <div class="lead-activity-card">
          <div class="lead-activity-topline">
            <strong>${escapeLeadActivityHtml(type)}</strong>
            <time>${escapeLeadActivityHtml(formatLeadActivityDate(activity.Created_at))}</time>
          </div>
          ${meta ? `<div class="lead-activity-meta">${escapeLeadActivityHtml(meta)}</div>` : ""}
          <div class="lead-activity-content">${escapeLeadActivityHtml(activity.Content || "—")}</div>
          <div class="lead-activity-footer">
            ${activity.Contact_name ? `<span>${escapeLeadActivityHtml(activity.Contact_name)}</span>` : ""}
            ${activity.Created_by ? `<span>${escapeLeadActivityHtml(activity.Created_by)}</span>` : ""}
          </div>
        </div>
      </article>`;
  }).join("");
}

function renderLeadActivityLoading() {
  const count = document.getElementById("leadProfileActivityCount");
  const body = document.getElementById("leadProfileActivityBody");
  if (count) count.textContent = "Loading activity...";
  if (body) {
    body.innerHTML = `
      <div class="lead-profile-activity-empty">
        <div class="lead-activity-spinner" aria-hidden="true"></div>
        <p>Loading activity history...</p>
      </div>`;
  }
}

function renderLeadActivityEmpty(title, message) {
  const count = document.getElementById("leadProfileActivityCount");
  const body = document.getElementById("leadProfileActivityBody");
  if (count && !getCurrentLeadActivityId()) count.textContent = "No lead selected";
  if (body) {
    body.innerHTML = `
      <div class="lead-profile-activity-empty">
        <div class="detail-empty-icon">◷</div>
        <h3>${escapeLeadActivityHtml(title)}</h3>
        <p>${escapeLeadActivityHtml(message)}</p>
      </div>`;
  }
}

function renderLeadActivityError() {
  const count = document.getElementById("leadProfileActivityCount");
  const body = document.getElementById("leadProfileActivityBody");
  if (count) count.textContent = "Activity unavailable";
  if (body) {
    body.innerHTML = `
      <div class="lead-profile-activity-empty">
        <div class="detail-empty-icon">!</div>
        <h3>Could not load activity</h3>
        <p>Refresh the page to try again.</p>
      </div>`;
  }
}

function leadActivityTime(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

function formatLeadActivityDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function prettifyLeadActivity(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

function escapeLeadActivityHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
