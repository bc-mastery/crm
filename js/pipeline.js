/**
 * Business Canvas CRM
 * Pipeline view
 *
 * Uses shared CRM browser cache.
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
 * PREFETCH CONFIG
 * ========================================================= */

const PIPELINE_PREFETCH_LIMIT =
  12;


/* =========================================================
 * INIT
 * ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  initializePipeline
);


async function initializePipeline() {

  bindPipelineEvents();

  bindPipelineCacheEvents();


  /*
   * Metadata and Lead database load
   * independently and in parallel.
   */
  const [
    metaResult
  ] =
    await Promise.allSettled([

      getCachedCrmMeta(),

      loadPipelineLeads()
    ]);


  if (
    metaResult.status ===
      "fulfilled"
  ) {

    PIPELINE_STATE.meta =
      metaResult.value;


    populatePipelineResponsibleFilter();

  } else {

    console.error(
      "Could not load CRM metadata.",
      metaResult.reason
    );
  }
}


/* =========================================================
 * CACHE EVENTS
 * ========================================================= */

function bindPipelineCacheEvents() {

  /*
   * cache.js can refresh the Lead database
   * quietly in the background.
   *
   * When that happens, refresh the Pipeline
   * without another API request.
   */
  window.addEventListener(
    "crm-leads-updated",
    event => {

      const leads =
        event.detail
          ?.leads;


      if (
        !Array.isArray(leads)
      ) {

        return;
      }


      PIPELINE_STATE.leads =
        leads;


      populatePipelineFilters(
        leads
      );


      applyPipelineFilters();
    }
  );
}


/* =========================================================
 * LOAD
 * ========================================================= */

async function loadPipelineLeads(
  options = {}
) {

  const forceRefresh =
    options.forceRefresh ===
      true;


  const existingCache =
    getStoredCrmLeads();


  /*
   * Only show loading message when there
   * is genuinely nothing available locally.
   */
  if (
    !existingCache ||
    forceRefresh
  ) {

    showPipelineStatus(
      "Loading pipeline..."
    );

  } else {

    hidePipelineStatus();
  }


  try {

    const leads =
      await getCachedCrmLeads({

        forceRefresh:
          forceRefresh,

        backgroundRefresh:
          !forceRefresh
      });


    PIPELINE_STATE.leads =
      leads;


    populatePipelineFilters(
      leads
    );


    applyPipelineFilters();


    hidePipelineStatus();


  } catch (error) {

    console.error(error);


    /*
     * If local cache exists, continue using it
     * even if a background refresh failed.
     */
    if (
      existingCache &&
      Array.isArray(
        existingCache.value
      )
    ) {

      PIPELINE_STATE.leads =
        existingCache.value;


      populatePipelineFilters(
        existingCache.value
      );


      applyPipelineFilters();


      hidePipelineStatus();

      return;
    }


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

        /*
         * Explicit Refresh bypasses cache.
         */
        try {

          PIPELINE_STATE.meta =
            await getCachedCrmMeta({
              forceRefresh:
                true
            });

        } catch (error) {

          console.error(error);
        }


        await loadPipelineLeads({
          forceRefresh:
            true
        });
      }
    );


  /* =====================================================
   * PIPELINE BOARD REFERENCES
   * ===================================================== */

  const board =
    document.getElementById(
      "pipelineBoard"
    );


  const scrollLeftButton =
    document.getElementById(
      "pipelineScrollLeft"
    );


  const scrollRightButton =
    document.getElementById(
      "pipelineScrollRight"
    );


  /* =====================================================
   * ONE-STAGE SCROLL STEP
   * ===================================================== */

  function getPipelineScrollStep() {

    const firstLane =
      board?.querySelector(
        ".pipeline-lane"
      );


    if (!firstLane) {
      return 272;
    }


    const boardStyles =
      window.getComputedStyle(
        board
      );


    const gap =
      parseFloat(
        boardStyles.columnGap ||
        boardStyles.gap ||
        "0"
      ) || 0;


    return (
      firstLane
        .getBoundingClientRect()
        .width +
      gap
    );
  }


  /* =====================================================
   * LEFT ARROW
   * ===================================================== */

  scrollLeftButton
    ?.addEventListener(
      "click",
      () => {

        if (!board) {
          return;
        }


        board.scrollBy({

          left:
            -getPipelineScrollStep(),

          behavior:
            "smooth"
        });
      }
    );


  /* =====================================================
   * RIGHT ARROW
   * ===================================================== */

  scrollRightButton
    ?.addEventListener(
      "click",
      () => {

        if (!board) {
          return;
        }


        board.scrollBy({

          left:
            getPipelineScrollStep(),

          behavior:
            "smooth"
        });
      }
    );


  /* =====================================================
   * GLOBAL PIPELINE TOUCHPAD SCROLLING
   * ===================================================== */

  const pipelineMain =
    document.querySelector(
      ".pipeline-main"
    );


  if (
    pipelineMain &&
    board
  ) {

    pipelineMain.addEventListener(
      "wheel",
      event => {

        const laneBody =
          event.target.closest(
            ".pipeline-lane-body"
          );


        if (
          Math.abs(
            event.deltaX
          ) >
          Math.abs(
            event.deltaY
          )
        ) {

          event.preventDefault();

          board.scrollLeft +=
            event.deltaX;

          return;
        }


        if (laneBody) {

          const canScrollVertically =
            laneBody.scrollHeight >
            laneBody.clientHeight;


          if (canScrollVertically) {

            return;
          }
        }


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


  /*
   * Preserve horizontal board position when
   * cache refreshes or filters re-render.
   */
  const previousScrollLeft =
    board.scrollLeft;


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


  board.scrollLeft =
    previousScrollLeft;


  /*
   * Once Pipeline is visible, quietly
   * preload a small number of Lead records.
   */
  schedulePipelinePrefetch();
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

        /*
         * Click opens Lead Profile.
         */
        card.addEventListener(
          "click",
          () => {

            openPipelineLead(
              card
            );
          }
        );


        /*
         * Keyboard navigation.
         */
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


        /*
         * Hover / focus prefetch.
         *
         * Often gives enough time for the full
         * Lead to enter cache before the user
         * actually clicks.
         */
        card.addEventListener(
          "mouseenter",
          () => {

            prefetchPipelineLead(
              card.dataset.pipelineLead
            );
          }
        );


        card.addEventListener(
          "focus",
          () => {

            prefetchPipelineLead(
              card.dataset.pipelineLead
            );
          }
        );
      }
    );


  return lane;
}


/* =========================================================
 * PREFETCH
 * ========================================================= */

function prefetchPipelineLead(
  leadId
) {

  if (!leadId) {
    return;
  }


  /*
   * If already cached, this resolves
   * immediately and costs no API call.
   */
  getCachedCrmLead(
    leadId
  )
    .catch(
      error => {

        /*
         * Prefetch failure should never
         * interrupt Pipeline usage.
         */
        console.warn(
          "Lead prefetch failed:",
          leadId,
          error
        );
      }
    );
}


/**
 * Quietly preload a small batch of
 * currently rendered Pipeline cards.
 */
function schedulePipelinePrefetch() {

  const runPrefetch =
    () => {

      const cards =
        Array.from(
          document.querySelectorAll(
            "[data-pipeline-lead]"
          )
        )
          .slice(
            0,
            PIPELINE_PREFETCH_LIMIT
          );


      /*
       * Fetch sequentially rather than firing
       * 12 Apps Script calls at once.
       */
      preloadPipelineCardsSequentially(
        cards,
        0
      );
    };


  if (
    "requestIdleCallback" in window
  ) {

    window.requestIdleCallback(
      runPrefetch,
      {
        timeout:
          1500
      }
    );

  } else {

    window.setTimeout(
      runPrefetch,
      600
    );
  }
}


async function preloadPipelineCardsSequentially(
  cards,
  index
) {

  if (
    !cards ||
    index >= cards.length
  ) {

    return;
  }


  const leadId =
    cards[index]
      ?.dataset
      ?.pipelineLead;


  if (leadId) {

    const existing =
      getStoredCrmLead(
        leadId
      );


    /*
     * Only API-fetch if we genuinely do not
     * already have the record.
     */
    if (!existing) {

      try {

        await getCachedCrmLead(
          leadId
        );

      } catch (error) {

        console.warn(
          "Background Lead preload failed:",
          leadId,
          error
        );
      }
    }
  }


  /*
   * Small gap so Apps Script is not hammered.
   */
  window.setTimeout(
    () => {

      preloadPipelineCardsSequentially(
        cards,
        index + 1
      );

    },
    120
  );
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


  /*
   * Start / continue prefetch before navigation.
   *
   * If mouseenter already started it,
   * cache.js reuses the same active request.
   */
  prefetchPipelineLead(
    leadId
  );


  window.location.href =
    `lead.html?lead=${encodeURIComponent(
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
