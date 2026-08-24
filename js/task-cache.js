/** Business Canvas CRM — shared Task browser cache */

const CRM_TASK_CACHE_CONFIG = {
  key: "bc_crm_tasks",
  ttlMs: 2 * 60 * 1000
};

const CRM_TASK_BROWSER_CACHE = {
  tasks: null,
  savedAt: 0,
  request: null
};

function readStoredCrmTasks_() {
  if (Array.isArray(CRM_TASK_BROWSER_CACHE.tasks)) {
    return {
      value: CRM_TASK_BROWSER_CACHE.tasks,
      savedAt: CRM_TASK_BROWSER_CACHE.savedAt
    };
  }

  try {
    const raw = localStorage.getItem(CRM_TASK_CACHE_CONFIG.key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.value)) return null;

    CRM_TASK_BROWSER_CACHE.tasks = parsed.value;
    CRM_TASK_BROWSER_CACHE.savedAt = Number(parsed.savedAt || 0);

    return {
      value: CRM_TASK_BROWSER_CACHE.tasks,
      savedAt: CRM_TASK_BROWSER_CACHE.savedAt
    };
  } catch (error) {
    console.warn("CRM task cache read failed:", error);
    return null;
  }
}

function writeStoredCrmTasks_(tasks) {
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const savedAt = Date.now();

  CRM_TASK_BROWSER_CACHE.tasks = safeTasks;
  CRM_TASK_BROWSER_CACHE.savedAt = savedAt;

  try {
    localStorage.setItem(
      CRM_TASK_CACHE_CONFIG.key,
      JSON.stringify({ savedAt, value: safeTasks })
    );
  } catch (error) {
    console.warn("CRM task cache write failed:", error);
  }

  window.dispatchEvent(
    new CustomEvent("crm-tasks-updated", {
      detail: { tasks: safeTasks, savedAt }
    })
  );

  return safeTasks;
}

async function refreshCrmTasksCache_() {
  if (CRM_TASK_BROWSER_CACHE.request) {
    return CRM_TASK_BROWSER_CACHE.request;
  }

  CRM_TASK_BROWSER_CACHE.request = getCrmTasks()
    .then(writeStoredCrmTasks_)
    .finally(() => {
      CRM_TASK_BROWSER_CACHE.request = null;
    });

  return CRM_TASK_BROWSER_CACHE.request;
}

async function getCachedCrmTasks(options = {}) {
  const forceRefresh = options.forceRefresh === true;
  const backgroundRefresh = options.backgroundRefresh !== false;
  const cached = readStoredCrmTasks_();

  if (cached && !forceRefresh) {
    const fresh = Date.now() - cached.savedAt < CRM_TASK_CACHE_CONFIG.ttlMs;

    if (!fresh && backgroundRefresh) {
      refreshCrmTasksCache_().catch(error => {
        console.warn("Background Task refresh failed:", error);
      });
    }

    return cached.value;
  }

  return refreshCrmTasksCache_();
}

function acceptCrmTaskIntoCache(task) {
  if (!task || !task.Task_id) return;
  const cached = readStoredCrmTasks_();
  const tasks = cached && Array.isArray(cached.value)
    ? [...cached.value]
    : [];

  const index = tasks.findIndex(item => String(item.Task_id) === String(task.Task_id));
  if (index >= 0) tasks[index] = task;
  else tasks.push(task);

  writeStoredCrmTasks_(tasks);
}

function invalidateCrmTasksCache() {
  CRM_TASK_BROWSER_CACHE.tasks = null;
  CRM_TASK_BROWSER_CACHE.savedAt = 0;
  try {
    localStorage.removeItem(CRM_TASK_CACHE_CONFIG.key);
  } catch (error) {
    console.warn("CRM task cache invalidation failed:", error);
  }
}
