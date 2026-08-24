/**
 * Business Canvas CRM
 * Dashboard performance layer
 *
 * Lead/meta data render from the shared browser cache first.
 * Task data is cache-first and refreshes independently so it never blocks the dashboard.
 */

async function loadDashboardData_(eventOrOptions = {}) {
  const forceRefresh = eventOrOptions instanceof Event || eventOrOptions?.forceRefresh === true;

  if (forceRefresh) {
    setDashboardStatus_("Refreshing dashboard…", "info");
  }

  try {
    const [leadsResult, metaResult] = await Promise.allSettled([
      getCachedCrmLeads({ forceRefresh, backgroundRefresh: !forceRefresh }),
      getCachedCrmMeta({ forceRefresh })
    ]);

    if (leadsResult.status !== "fulfilled") {
      throw leadsResult.reason;
    }

    DASHBOARD_STATE.leads = leadsResult.value || [];
    DASHBOARD_STATE.meta = metaResult.status === "fulfilled" ? metaResult.value : null;

    const cachedTasks = typeof readStoredCrmTasks_ === "function"
      ? readStoredCrmTasks_()
      : null;

    DASHBOARD_STATE.tasks = cachedTasks?.value || [];

    /* Critical dashboard content renders now. */
    populateDashboardUsers_();
    applyDashboardFilters_();
    clearDashboardStatus_();

    /* Task-dependent widgets refresh independently. */
    getCachedCrmTasks({ forceRefresh, backgroundRefresh: !forceRefresh })
      .then(tasks => {
        DASHBOARD_STATE.tasks = Array.isArray(tasks) ? tasks : [];
        applyDashboardFilters_();
        clearDashboardStatus_();
      })
      .catch(taskError => {
        console.warn("Dashboard task refresh failed:", taskError);
        if (!cachedTasks) {
          setDashboardStatus_(
            "Dashboard loaded, but task data is temporarily unavailable.",
            "warning"
          );
        }
      });

  } catch (error) {
    console.error(error);
    setDashboardStatus_(
      "Could not load dashboard: " + (error?.message || String(error)),
      "error"
    );
  }
}

window.addEventListener("crm-tasks-updated", event => {
  const tasks = event.detail?.tasks;
  if (!Array.isArray(tasks)) return;
  DASHBOARD_STATE.tasks = tasks;
  applyDashboardFilters_();
});

window.addEventListener("crm-leads-updated", event => {
  const leads = event.detail?.leads;
  if (!Array.isArray(leads)) return;
  DASHBOARD_STATE.leads = leads;
  applyDashboardFilters_();
});
