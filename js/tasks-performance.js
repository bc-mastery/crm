/** Business Canvas CRM — Tasks performance layer */

window.loadTasksPageData = async function loadTasksPageData(eventOrOptions = {}) {
  const forceRefresh = eventOrOptions instanceof Event || eventOrOptions?.forceRefresh === true;
  const existingTasks = typeof readStoredCrmTasks_ === "function" ? readStoredCrmTasks_() : null;
  const existingLeads = typeof getStoredCrmLeads === "function" ? getStoredCrmLeads() : null;

  if (!existingTasks || !existingLeads || forceRefresh) {
    setTasksStatus(forceRefresh ? "Refreshing tasks..." : "Loading tasks...", "info");
  } else {
    hideTasksStatus();
  }

  try {
    const [tasks, leads, meta] = await Promise.all([
      getCachedCrmTasks({ forceRefresh, backgroundRefresh: !forceRefresh }),
      getCachedCrmLeads({ forceRefresh, backgroundRefresh: !forceRefresh }),
      getCachedCrmMeta({ forceRefresh })
    ]);

    TASKS_STATE.tasks = Array.isArray(tasks) ? tasks : [];
    TASKS_STATE.leads = Array.isArray(leads) ? leads : [];
    TASKS_STATE.meta = meta || null;

    populateTaskFilters();
    populateTaskDialogOptions();
    applyTaskFilters();
    hideTasksStatus();
  } catch (error) {
    console.error(error);

    if (existingTasks && existingLeads) {
      TASKS_STATE.tasks = existingTasks.value || [];
      TASKS_STATE.leads = existingLeads.value || [];
      populateTaskFilters();
      populateTaskDialogOptions();
      applyTaskFilters();
      hideTasksStatus();
      return;
    }

    setTasksStatus("Could not load Tasks: " + (error?.message || String(error)), "error");
  }
};

window.addEventListener("crm-tasks-updated", event => {
  const tasks = event.detail?.tasks;
  if (!Array.isArray(tasks)) return;
  TASKS_STATE.tasks = tasks;
  populateTaskFilters();
  populateTaskDialogOptions();
  applyTaskFilters();
});

window.addEventListener("crm-leads-updated", event => {
  const leads = event.detail?.leads;
  if (!Array.isArray(leads)) return;
  TASKS_STATE.leads = leads;
  populateTaskFilters();
  populateTaskDialogOptions();
  applyTaskFilters();
});
