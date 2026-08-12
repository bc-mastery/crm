/**
 * Business Canvas CRM
 * Pipeline view
 */


/* =========================================================
 * STATE
 * ========================================================= */

let PIPELINE_STATE = {

  leads: [],

  filteredLeads: [],

  meta: null
};


/* =========================================================
 * STAGE ORDER
 * ========================================================= */

const PIPELINE_STAGE_ORDER = [

  "RESEARCHED",
  "CONNECTION_REQUESTED",
  "CONNECTED",
  "MESSAGED",
  "RESPONDED",

  "REVIEW_CALL_OFFERED",
  "REVIEW_CALL_BOOKED",

  "GS_SENT",
  "GS_COMPLETED",

  "REVIEW_CALL_DONE",
  "PROPOSAL_SENT",

  "WON",
  "LOST",
  "ARCHIVED"
];


/* =========================================================
 * LAST ACTION FIELDS
 * ========================================================= */

const PIPELINE_LAST_ACTION_FIELDS = [

  "Connection_request_sent",
  "Connection_accepted",
  "Message_sent",
  "Response_time",

  "RC_offered_time",
  "RC_booked_time",

  "GS_sent_time",
  "GS_completed_time",

  "RC_done_time",
  "Proposal_time",

  "Won_time",
  "Lost_time"
];


/* =========================================================
 * INIT
 * ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  initializePipeline
);


async function initializePipeline() {

  bindPipelineEvents();


  try {

    PIPELINE_STATE.meta =
      await getCrmMeta();

  } catch (error) {

    console.error(
      "Could not load CRM metadata.",
      error
    );
  }


  await loadPipelineLeads();
}


/* =========================================================
 * LOAD
 * ========================================================= */

async function loadPipelineLeads() {

  showPipelineStatus(
    "Loading pipeline..."
  );


  try {

    const leads =
      await getCrmLeads();


    PIPELINE_STATE.leads =
      leads;


    populatePipelineFilters(
      leads
    );


    applyPipelineFilters();


    hidePipelineStatus();


  } catch (error) {

    console.error(error);


    showPipelineStatus(
      "Could not load pipeline: " +
      error.message,
      "error"
    );
  }
}


/* =========================================================
 * EVENTS
 * ========================================================= */

function bindPipelineEvents() {

  document
    .getElementById(
      "pipelineSearchInput"
    )
    ?.addEventListener(
      "input",
      applyPipelineFilters
    );


  [
    "pipelineIcpFilter",
    "pipelineResearchFilter",
    "pipelineNextActionFilter",
    "pipelineResponsibleFilter",
    "pipelineOrder"
  ].forEach(
    id => {

      document
        .getElementById(id)
        ?.addEventListener(
          "change",
          applyPipelineFilters
        );
    }
  );


  document
    .getElementById(
      "pipelineRefreshButton"
    )
    ?.addEventListener(
      "click",
      async () => {

        try {

          PIPELINE_STATE.meta =
            await getCrmMeta();

        } catch (error) {

          console.error(error);
        }


        await loadPipelineLeads();
      }
    );


  /* =====================================================
   * GLOBAL PIPELINE TOUCHPAD SCROLLING
   * ===================================================== */

  const pipelineMain =
    document.querySelector(
      ".pipeline-main"
    );


  const board =
    document.getElementById(
      "pipelineBoard"
    );


  if (
    pipelineMain &&
    board
  ) {

    pipelineMain.addEventListener(
      "wheel",
      event => {

        /*
         * Check whether the pointer is currently
         * over a vertically scrollable stage.
         */
        const laneBody =
          event.target.closest(
            ".pipeline-lane-body"
          );


        /*
         * Horizontal touchpad gesture:
         * always move the Pipeline board horizontally.
         */
        if (
          Math.abs(event.deltaX) >
          Math.abs(event.deltaY)
        ) {

          event.preventDefault();

          board.scrollLeft +=
            event.deltaX;

          return;
        }


        /*
         * If we're over a stage that actually has
         * vertical scrolling available, preserve
         * normal up/down scrolling in that stage.
         */
        if (laneBody) {

          const canScrollVertically =
            laneBody.scrollHeight >
            laneBody.clientHeight;


          if (canScrollVertically) {

            return;
          }
        }


        /*
         * Everywhere else in the light Pipeline area,
         * convert vertical touchpad / mouse-wheel
         * movement into horizontal board scrolling.
         */
        if (
          event.deltaY !== 0
        ) {

          event.preventDefault();

          board.scrollLeft +=
            event.deltaY;
        }

      },
      {
        passive: false
      }
    );
  }
}


/* =========================================================
 * FILTER POPULATION
 * ========================================================= */

function populatePipelineFilters(
  leads
) {

  populatePipelineFilterFromField(
    "pipelineIcpFilter",
    leads,
    "ICP_fit_level",
    "All ICP fits"
  );


  populatePipelineFilterFromField(
    "pipelineResearchFilter",
    leads,
    "Research_status",
    "All research statuses"
  );


  populatePipelineFilterFromField(
    "pipelineNextActionFilter",
    leads,
    "Next_action_type",
    "All next actions"
  );


  populatePipelineResponsibleFilter();
}


function populatePipelineFilterFromField(
  selectId,
  leads,
  field,
  emptyLabel
) {

  const select =
    document.getElementById(
      selectId
    );


  if (!select) {
    return;
  }


  const currentValue =
    select.value;


  const values =
    [
      ...new Set(
        leads
          .map(
            lead =>
              String(
                lead[field] || ""
              ).trim()
          )
          .filter(Boolean)
      )
    ]
      .sort(
        (a, b) =>
          a.localeCompare(b)
      );


  select.innerHTML = `

    <option value="">
      ${escapePipelineHtml(
        emptyLabel
      )}
    </option>
  `;


  values.forEach(
    value => {

      const option =
        document.createElement(
          "option"
        );


      option.value =
        value;


      option.textContent =
        formatPipelineLabel(
          value
        );


      select.appendChild(
        option
      );
    }
  );


  if (
    values.includes(
      currentValue
    )
  ) {

    select.value =
      currentValue;
  }
}


function populatePipelineResponsibleFilter() {

  const select =
    document.getElementById(
      "pipelineResponsibleFilter"
    );


  if (!select) {
    return;
  }


  const currentValue =
    select.value;


  const users =
    PIPELINE_STATE.meta
      ?.responsibleUsers ||
    [];


  select.innerHTML = `

    <option value="">
      ${
        users.length === 1
          ? "My leads"
          : "All responsible users"
      }
    </option>
  `;


  users.forEach(
    user => {

      const option =
        document.createElement(
          "option"
        );


      option.value =
        user.email;


      option.textContent =
        user.name ||
        user.email;


      select.appendChild(
        option
      );
    }
  );


  if (
    users.some(
      user =>
        user.email ===
        currentValue
    )
  ) {

    select.value =
      currentValue;
  }
}


/* =========================================================
 * FILTERING
 * ========================================================= */

function applyPipelineFilters() {

  const searchValue =
    getPipelineElementValue(
      "pipelineSearchInput"
    )
      .toLowerCase();


  const icpValue =
    getPipelineElementValue(
      "pipelineIcpFilter"
    )
      .toUpperCase();


  const researchValue =
    getPipelineElementValue(
      "pipelineResearchFilter"
    )
      .toUpperCase();


  const actionValue =
    getPipelineElementValue(
      "pipelineNextActionFilter"
    )
      .toUpperCase();


  const responsibleValue =
    getPipelineElementValue(
      "pipelineResponsibleFilter"
    )
      .toLowerCase();


  const filtered =
    PIPELINE_STATE.leads
      .filter(
        lead => {

          const searchable =
            [
              lead.Company_name,
              lead.Founder_1_name,
              lead.Lead_id,
              lead.Responsible_name,
              lead.Responsible_email
            ]
              .join(" ")
              .toLowerCase();


          const matchesSearch =
            !searchValue ||
            searchable.includes(
              searchValue
            );


          const matchesIcp =
            !icpValue ||
            String(
              lead.ICP_fit_level || ""
            ).toUpperCase() ===
              icpValue;


          const matchesResearch =
            !researchValue ||
            String(
              lead.Research_status || ""
            ).toUpperCase() ===
              researchValue;


          const matchesAction =
            !actionValue ||
            String(
              lead.Next_action_type || ""
            ).toUpperCase() ===
              actionValue;


          const matchesResponsible =
            !responsibleValue ||
            String(
              lead.Responsible_email || ""
            ).toLowerCase() ===
              responsibleValue;


          return (
            matchesSearch &&
            matchesIcp &&
            matchesResearch &&
            matchesAction &&
            matchesResponsible
          );
        }
      );


  PIPELINE_STATE.filteredLeads =
    filtered;


  renderPipelineBoard(
    filtered
  );
}


/* =========================================================
 * BOARD
 * ========================================================= */

function renderPipelineBoard(
  leads
) {

  const board =
    document.getElementById(
      "pipelineBoard"
    );


  if (!board) {
    return;
  }


  board.innerHTML =
    "";


  const grouped =
    groupLeadsByPipelineStage(
      leads
    );


  PIPELINE_STAGE_ORDER
    .forEach(
      stage => {

        const stageLeads =
          sortPipelineCards(
            grouped[stage] || []
          );


        board.appendChild(
          createPipelineLane(
            stage,
            stageLeads
          )
        );
      }
    );
}


/* =========================================================
 * GROUP
 * ========================================================= */

function groupLeadsByPipelineStage(
  leads
) {

  const grouped = {};


  PIPELINE_STAGE_ORDER
    .forEach(
      stage => {

        grouped[stage] =
          [];
      }
    );


  leads.forEach(
    lead => {

      let stage =
        String(
          lead.Pipeline_stage || ""
        )
          .trim()
          .toUpperCase();


      if (
        normalizePipelineBoolean(
          lead.Is_archived
        )
      ) {

        stage =
          "ARCHIVED";
      }


      if (
        !grouped[stage]
      ) {

        grouped[stage] =
          [];
      }


      grouped[stage].push(
        lead
      );
    }
  );


  return grouped;
}


/* =========================================================
 * LANE
 * ========================================================= */

function createPipelineLane(
  stage,
  leads
) {

  const lane =
    document.createElement(
      "section"
    );


  lane.className =
    `pipeline-lane pipeline-lane-${stage
      .toLowerCase()
      .replaceAll("_", "-")}`;


  lane.innerHTML = `

    <div class="pipeline-lane-header">

      <div class="pipeline-lane-title">

        <span>
          ${escapePipelineHtml(
            formatPipelineLabel(
              stage
            )
          )}
        </span>

        <strong>
          ${leads.length}
        </strong>

      </div>

    </div>


    <div class="pipeline-lane-body">

      ${
        leads.length

          ? leads
              .map(
                lead =>
                  renderPipelineCard(
                    lead
                  )
              )
              .join("")

          : `

            <div class="pipeline-empty-stage">
              No leads
            </div>
          `
      }

    </div>
  `;


  lane
    .querySelectorAll(
      "[data-pipeline-lead]"
    )
    .forEach(
      card => {

        card.addEventListener(
          "click",
          () => {

            openPipelineLead(
              card
            );
          }
        );


        card.addEventListener(
          "keydown",
          event => {

            if (
              event.key !== "Enter" &&
              event.key !== " "
            ) {

              return;
            }


            event.preventDefault();


            openPipelineLead(
              card
            );
          }
        );
      }
    );


  return lane;
}


/* =========================================================
 * OPEN LEAD
 * ========================================================= */

function openPipelineLead(
  card
) {

  const leadId =
    card.dataset.pipelineLead;


  if (!leadId) {
    return;
  }


  window.location.href =
    `index.html?lead=${encodeURIComponent(
      leadId
    )}`;
}


/* =========================================================
 * CARD
 * ========================================================= */

function renderPipelineCard(
  lead
) {

  const nextAction =
    lead.Next_action_type;


  const nextActionDate =
    lead.Next_action_at;


  const lastActionDate =
    getPipelineLastActionDate(
      lead
    );


  return `

    <article
      class="pipeline-card"
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
          Next
        </span>

        <strong
          class="${
            nextAction
              ? ""
              : "pipeline-card-warning"
          }"
        >

          ${
            nextAction

              ? escapePipelineHtml(
                  formatPipelineLabel(
                    nextAction
                  )
                )

              : "No next action"
          }

        </strong>

      </div>


      <div class="pipeline-card-row">

        <span class="pipeline-card-label">
          Due
        </span>

        <span>

          ${escapePipelineHtml(
            formatPipelineDate(
              nextActionDate
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
            lead.Responsible_name ||
            lead.Responsible_email ||
            "—"
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


/* =========================================================
 * SORT
 * ========================================================= */

function sortPipelineCards(
  leads
) {

  const order =
    getPipelineElementValue(
      "pipelineOrder"
    ) ||
    "next_action_asc";


  const sorted =
    [...leads];


  sorted.sort(
    (a, b) => {

      switch (order) {

        case "next_action_desc":

          return comparePipelineDates(
            a.Next_action_at,
            b.Next_action_at,
            "desc"
          );


        case "last_action_desc":

          return comparePipelineDates(
            getPipelineLastActionDate(a),
            getPipelineLastActionDate(b),
            "desc"
          );


        case "last_action_asc":

          return comparePipelineDates(
            getPipelineLastActionDate(a),
            getPipelineLastActionDate(b),
            "asc"
          );


        case "newest":

          return comparePipelineDates(
            a.Company_lead,
            b.Company_lead,
            "desc"
          );


        case "oldest":

          return comparePipelineDates(
            a.Company_lead,
            b.Company_lead,
            "asc"
          );


        case "company_az":

          return String(
            a.Company_name || ""
          ).localeCompare(
            String(
              b.Company_name || ""
            ),
            undefined,
            {
              sensitivity:
                "base"
            }
          );


        case "next_action_asc":
        default:

          return comparePipelineDates(
            a.Next_action_at,
            b.Next_action_at,
            "asc"
          );
      }
    }
  );


  return sorted;
}


/* =========================================================
 * LAST ACTION
 * ========================================================= */

function getPipelineLastActionDate(
  lead
) {

  let newest =
    null;


  PIPELINE_LAST_ACTION_FIELDS
    .forEach(
      field => {

        const timestamp =
          parsePipelineDateTime(
            lead[field]
          );


        if (
          timestamp === null
        ) {

          return;
        }


        if (
          newest === null ||
          timestamp > newest
        ) {

          newest =
            timestamp;
        }
      }
    );


  return newest;
}


/* =========================================================
 * DATE SORT
 * ========================================================= */

function comparePipelineDates(
  valueA,
  valueB,
  direction
) {

  const timeA =
    parsePipelineDateTime(
      valueA
    );


  const timeB =
    parsePipelineDateTime(
      valueB
    );


  if (
    timeA === null &&
    timeB === null
  ) {

    return 0;
  }


  if (
    timeA === null
  ) {

    return 1;
  }


  if (
    timeB === null
  ) {

    return -1;
  }


  return direction ===
    "asc"

      ? timeA - timeB

      : timeB - timeA;
}


/* =========================================================
 * STATUS
 * ========================================================= */

function showPipelineStatus(
  message,
  type = "info"
) {

  const panel =
    document.getElementById(
      "pipelineStatusPanel"
    );


  if (!panel) {
    return;
  }


  panel.hidden =
    false;


  panel.className =
    `status-panel status-${type}`;


  panel.textContent =
    message;
}


function hidePipelineStatus() {

  const panel =
    document.getElementById(
      "pipelineStatusPanel"
    );


  if (!panel) {
    return;
  }


  panel.hidden =
    true;


  panel.textContent =
    "";
}


/* =========================================================
 * HELPERS
 * ========================================================= */

function getPipelineElementValue(
  id
) {

  return String(
    document
      .getElementById(id)
      ?.value || ""
  ).trim();
}


function formatPipelineLabel(
  value
) {

  if (!value) {
    return "";
  }


  return String(value)
    .replaceAll(
      "_",
      " "
    )
    .replace(
      /\b\w/g,
      char =>
        char.toUpperCase()
    );
}


function formatPipelineDate(
  value
) {

  const timestamp =
    parsePipelineDateTime(
      value
    );


  if (
    timestamp === null
  ) {

    return "—";
  }


  return new Intl.DateTimeFormat(
    "en-GB",
    {
      year:
        "numeric",

      month:
        "short",

      day:
        "2-digit"
    }
  ).format(
    new Date(timestamp)
  );
}


function parsePipelineDateTime(
  value
) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return null;
  }


  if (
    typeof value ===
      "number" &&
    Number.isFinite(value)
  ) {

    if (
      value >
      100000000000
    ) {

      return value;
    }
  }


  const date =
    new Date(value);


  if (
    isNaN(
      date.getTime()
    )
  ) {

    return null;
  }


  return date.getTime();
}


function normalizePipelineBoolean(
  value
) {

  if (
    value === true
  ) {

    return true;
  }


  return [
    "TRUE",
    "YES",
    "1"
  ].includes(
    String(
      value || ""
    )
      .trim()
      .toUpperCase()
  );
}


/* =========================================================
 * ESCAPING
 * ========================================================= */

function escapePipelineHtml(
  value
) {

  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}


function escapePipelineAttribute(
  value
) {

  return escapePipelineHtml(
    value
  );
}
