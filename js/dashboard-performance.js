/**
 * Business Canvas CRM
 * Dashboard performance layer
 *
 * Keeps the dashboard's critical rendering path on the shared browser cache.
 * Lead/meta data render first; task data is refreshed independently afterwards.
 */

async function loadDashboardData_() {
  setDashboardStatus_("Loading dashboard…", "info");

  try {
    const [leadsResult, metaResult] = await Promise.allSettled([
      getCachedCrmLeads(),
      getCachedCrmMeta()
    ]);

    if (leadsResult.status !== "fulfilled") {
      throw leadsResult.reason;
    }

    DASHBOARD_STATE.leads = leadsResult.value || [];
    DASHBOARD_STATE.meta = metaResult.status === "fulfilled" ? metaResult.value : null;

    /*
     * Render the dashboard immediately from lead/meta data.
     * Tasks should never block funnel/pipeline analytics.
     */
    populateDashboardUsers_();
    applyDashboardFilters_();
    clearDashboardStatus_();

    /*
     * Refresh task-dependent widgets separately.
     */
    try {
      DASHBOARD_STATE.tasks = await getCrmTasks();
      applyDashboardFilters_();
    } catch (taskError) {
      console.warn("Dashboard task refresh failed:", taskError);
      setDashboardStatus_(
        "Dashboard loaded, but task data is temporarily unavailable.",
        "warning"
      );
    }

  } catch (error) {
    console.error(error);
    setDashboardStatus_(
      "Could not load dashboard: " + (error?.message || String(error)),
      "error"
    );
  }
}
