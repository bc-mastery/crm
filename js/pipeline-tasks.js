/**
 * Business Canvas CRM
 * Pipeline task integration
 *
 * Adds the earliest OPEN task to each Pipeline card.
 * Overdue tasks are highlighted in red.
 */


/* =========================================================
 * TASK STATE
 * ========================================================= */

const PIPELINE_TASK_STATE = {
  tasks: [],
  byLead: {}
};


/* =========================================================
 * INIT
 * ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    loadPipelineTasks();

    document
      .getElementById(
        "pipelineRefreshButton"
      )
      ?.addEventListener(
        "click",
        () => {
          loadPipelineTasks();
        }
      );
  }
);


/* =========================================================
 * LOAD TASKS
 * ========================================================= */

async function loadPipelineTasks() {

  try {

    const tasks =
      await getCrmTasks();

    PIPELINE_TASK_STATE.tasks =
      Array.isArray(tasks)
        ? tasks
        : [];

    PIPELINE_TASK_STATE.byLead =
      buildPipelineTaskMap(
        PIPELINE_TASK_STATE.tasks
      );

    /*
     * Re-render using the already loaded Lead data.
     * This avoids another Lead API request.
     */
    if (
      typeof applyPipelineFilters ===
        "function" &&
      typeof PIPELINE_STATE !==
        "undefined" &&
      Array.isArray(
        PIPELINE_STATE.leads
      )
    ) {
      applyPipelineFilters();
    }

  } catch (error) {

    console.error(
      "Could not load Pipeline tasks.",
      error
    );
  }
}


/* =========================================================
 * TASK MAP
 *
 * One Pipeline card shows the next OPEN task.
 * If several OPEN tasks exist for the Lead,
 * the earliest due task wins.
 * ========================================================= */

function buildPipelineTaskMap(
  tasks
) {

  const map = {};

  tasks
    .filter(
      task =>
        String(
          task.Status || ""
        )
          .trim()
          .toUpperCase() ===
        "OPEN"
    )
    .forEach(
      task => {

        const leadId =
          String(
            task.Lead_id || ""
          ).trim();

        if (!leadId) {
          return;
        }

        const existing =
          map[leadId];

        if (
          !existing ||
          comparePipelineTaskDueDates(
            task.Due_at,
            existing.Due_at
          ) < 0
        ) {
          map[leadId] =
            task;
        }
      }
    );

  return map;
}


function comparePipelineTaskDueDates(
  a,
  b
) {

  const timeA =
    getPipelineTaskTime(a);

  const timeB =
    getPipelineTaskTime(b);

  if (
    timeA === null &&
    timeB === null
  ) {
    return 0;
  }

  if (timeA === null) {
    return 1;
  }

  if (timeB === null) {
    return -1;
  }

  return timeA - timeB;
}


function getPipelineTaskTime(
  value
) {

  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  const time =
    date.getTime();

  return Number.isFinite(time)
    ? time
    : null;
}


function isPipelineTaskOverdue(
  dueAt
) {

  if (!dueAt) {
    return false;
  }

  const due =
    new Date(dueAt);

  if (
    Number.isNaN(
      due.getTime()
    )
  ) {
    return false;
  }

  /*
   * A task due today is not shown as overdue.
   * It becomes overdue from the following day.
   */
  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  due.setHours(
    0,
    0,
    0,
    0
  );

  return due < today;
}


/* =========================================================
 * PIPELINE CARD OVERRIDE
 *
 * pipeline.js resolves renderPipelineCard() at render time,
 * so loading this file after pipeline.js safely upgrades the
 * card without changing the rest of the Pipeline controller.
 * ========================================================= */

function renderPipelineCard(
  lead
) {

  const task =
    PIPELINE_TASK_STATE
      .byLead[
        String(
          lead.Lead_id || ""
        ).trim()
      ] ||
    null;

  const taskLabel =
    task
      ? (
          task.Task_title ||
          formatPipelineLabel(
            task.Task_type ||
            "TASK"
          )
        )
      : "No open task";

  const taskDue =
    task
      ? task.Due_at
      : null;

  const overdue =
    task
      ? isPipelineTaskOverdue(
          taskDue
        )
      : false;

  const responsible =
    task
      ? (
          task.Responsible_name ||
          task.Responsible_email ||
          lead.Responsible_name ||
          lead.Responsible_email ||
          "—"
        )
      : (
          lead.Responsible_name ||
          lead.Responsible_email ||
          "—"
        );

  const lastActionDate =
    getPipelineLastActionDate(
      lead
    );

  return `

    <article
      class="pipeline-card${
        overdue
          ? " pipeline-card-has-overdue-task"
          : ""
      }"
      data-pipeline-lead="${escapePipelineAttribute(
        lead.Lead_id
      )}"
      tabindex="0"
    >

      <div class="pipeline-card-company">

        ${escapePipelineHtml(
          lead.Company_name ||
          "Unnamed company"
        )}

      </div>


      <div class="pipeline-card-founder">

        ${escapePipelineHtml(
          lead.Founder_1_name ||
          "No founder"
        )}

      </div>


      <div class="pipeline-card-divider">
      </div>


      <div class="pipeline-card-row">

        <span class="pipeline-card-label">
          Task
        </span>

        <strong
          class="${
            task
              ? (
                  overdue
                    ? "pipeline-card-overdue-text"
                    : ""
                )
              : "pipeline-card-warning"
          }"
        >

          ${escapePipelineHtml(
            taskLabel
          )}

        </strong>

      </div>


      <div class="pipeline-card-row">

        <span class="pipeline-card-label">
          Due
        </span>

        <span
          class="${
            overdue
              ? "pipeline-card-overdue-text"
              : ""
          }"
        >

          ${
            overdue
              ? `<strong class="pipeline-card-overdue-badge">OVERDUE</strong> `
              : ""
          }

          ${escapePipelineHtml(
            formatPipelineDate(
              taskDue
            )
          )}

        </span>

      </div>


      <div class="pipeline-card-row">

        <span class="pipeline-card-label">
          Responsible
        </span>

        <span>

          ${escapePipelineHtml(
            responsible
          )}

        </span>

      </div>


      <div class="pipeline-card-row pipeline-card-last">

        <span class="pipeline-card-label">
          Last action
        </span>

        <span>

          ${escapePipelineHtml(
            formatPipelineDate(
              lastActionDate
            )
          )}

        </span>

      </div>

    </article>
  `;
}
