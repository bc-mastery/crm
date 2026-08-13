/**
 * Business Canvas CRM
 * Leads page controller
 *
 * Uses shared CRM browser cache.
 */


/* =========================================================
 * STATE
 * ========================================================= */

let CRM_STATE = {

  leads: [],
  filteredLeads: [],

  selectedLeadId: null,
  selectedLead: null,

  meta: null,

  pendingUpdates: {},

  editingField: null,

  workflowBusy: false
};


/* =========================================================
 * SHARED LEAD DETAIL CONFIG
 * ========================================================= */

configureLeadDetail({

  panelId:
    "leadDetail",


  getState:
    () =>
      CRM_STATE,


  onLeadUpdated:
    updatedLead =>
      acceptUpdatedLead(
        updatedLead
      ),


  showStatus:
    (message, type) =>
      showCrmStatus(
        message,
        type
      ),


  openProfile:
    lead => {

      if (
        !lead ||
        !lead.Lead_id
      ) {

        return;
      }


      window.location.href =
        `lead.html?lead=${encodeURIComponent(
          lead.Lead_id
        )}`;
    }
});


/* =========================================================
 * LAST ACTION TIMESTAMP FIELDS
 * ========================================================= */

const CRM_LAST_ACTION_FIELDS = [

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
  initializeCrmApp
);


async function initializeCrmApp() {

  bindCrmUiEvents();

  bindCrmCacheEvents();


  /*
   * Metadata and Lead database can load
   * independently and in parallel.
   */
  const [
    metaResult
  ] =
    await Promise.allSettled([

      getCachedCrmMeta(),

      loadCrmLeads()
    ]);


  if (
    metaResult.status ===
      "fulfilled"
  ) {

    CRM_STATE.meta =
      metaResult.value;


    /*
     * Responsible filter may have rendered
     * before metadata arrived.
     */
    populateResponsibleFilter();

  } else {

    console.error(
      "Could not load CRM metadata.",
      metaResult.reason
    );
  }


  await openLeadFromUrl();
}


/* =========================================================
 * CACHE EVENTS
 * ========================================================= */

function bindCrmCacheEvents() {

  /*
   * When cache.js refreshes the database
   * silently in the background, update the
   * visible page without another API call.
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


      CRM_STATE.leads =
        leads;


      populateAllFilters(
        leads
      );


      applyLeadFilters();
    }
  );
}


/* =========================================================
 * OPEN LEAD FROM URL
 * ========================================================= */

async function openLeadFromUrl() {

  const params =
    new URLSearchParams(
      window.location.search
    );


  const leadId =
    String(
      params.get("lead") || ""
    ).trim();


  if (!leadId) {
    return;
  }


  const leadExists =
    CRM_STATE.leads.some(
      lead =>
        String(
          lead.Lead_id || ""
        ).trim() ===
        leadId
    );


  if (!leadExists) {

    showCrmStatus(
      "The requested lead is not available.",
      "error"
    );

    return;
  }


  await selectCrmLead(
    leadId
  );


  const selectedRow =
    document.querySelector(
      `.lead-row[data-lead-id="${CSS.escape(
        leadId
      )}"]`
    );


  if (selectedRow) {

    selectedRow.scrollIntoView({

      behavior:
        "smooth",

      block:
        "center"
    });
  }


  const cleanUrl =
    window.location.pathname;


  window.history.replaceState(
    {},
    document.title,
    cleanUrl
  );
}


/* =========================================================
 * LOAD LEADS
 * ========================================================= */

async function loadCrmLeads(
  options = {}
) {

  const forceRefresh =
    options.forceRefresh ===
      true;


  /*
   * Check whether browser cache already
   * contains a Lead database.
   */
  const existingCache =
    getStoredCrmLeads();


  /*
   * Only show "Loading leads..." when
   * we genuinely have nothing to render.
   */
  if (
    !existingCache ||
    forceRefresh
  ) {

    showCrmStatus(
      "Loading leads..."
    );

  } else {

    hideCrmStatus();
  }


  try {

    const leads =
      await getCachedCrmLeads({

        forceRefresh:
          forceRefresh,

        backgroundRefresh:
          !forceRefresh
      });


    CRM_STATE.leads =
      leads;


    populateAllFilters(
      leads
    );


    applyLeadFilters();


    hideCrmStatus();


  } catch (error) {

    console.error(error);


    /*
     * If we already had cached data,
     * keep using it even if refresh failed.
     */
    if (
      existingCache &&
      Array.isArray(
        existingCache.value
      )
    ) {

      CRM_STATE.leads =
        existingCache.value;


      populateAllFilters(
        existingCache.value
      );


      applyLeadFilters();


      hideCrmStatus();

      return;
    }


    showCrmStatus(
      "Could not load CRM leads: " +
      error.message,
      "error"
    );
  }
}


/* =========================================================
 * GLOBAL UI EVENTS
 * ========================================================= */

function bindCrmUiEvents() {

  const filterIds = [

    "stageFilter",
    "icpFilter",
    "researchStatusFilter",
    "nextActionTypeFilter",
    "responsibleFilter",
    "listOrder"
  ];


  document
    .getElementById(
      "searchInput"
    )
    ?.addEventListener(
      "input",
      applyLeadFilters
    );


  filterIds.forEach(
    id => {

      document
        .getElementById(id)
        ?.addEventListener(
          "change",
          applyLeadFilters
        );
    }
  );


  document
    .getElementById(
      "refreshButton"
    )
    ?.addEventListener(
      "click",
      async () => {

        CRM_STATE.selectedLeadId =
          null;

        CRM_STATE.selectedLead =
          null;

        CRM_STATE.pendingUpdates =
          {};

        CRM_STATE.editingField =
          null;


        renderEmptyLeadDetail();


        /*
         * Explicit Refresh means:
         * bypass cache and ask API for fresh data.
         */
        try {

          CRM_STATE.meta =
            await getCachedCrmMeta({
              forceRefresh:
                true
            });

        } catch (error) {

          console.error(error);
        }


        await loadCrmLeads({
          forceRefresh:
            true
        });
      }
    );
}


/* =========================================================
 * POPULATE FILTERS
 * ========================================================= */

function populateAllFilters(
  leads
) {

  populateFilterFromLeadField(
    "stageFilter",
    leads,
    "Pipeline_stage",
    "All pipeline stages"
  );


  populateFilterFromLeadField(
    "icpFilter",
    leads,
    "ICP_fit_level",
    "All ICP fits"
  );


  populateFilterFromLeadField(
    "researchStatusFilter",
    leads,
    "Research_status",
    "All research statuses"
  );


  populateFilterFromLeadField(
    "nextActionTypeFilter",
    leads,
    "Next_action_type",
    "All next actions"
  );


  populateResponsibleFilter();
}


function populateFilterFromLeadField(
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
      ${escapeHtml(
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
        formatCrmLabel(
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


function populateResponsibleFilter() {

  const select =
    document.getElementById(
      "responsibleFilter"
    );


  if (!select) {
    return;
  }


  const currentValue =
    select.value;


  const users =
    CRM_STATE.meta
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
 * FILTER + ORDER
 * ========================================================= */

function applyLeadFilters() {

  const searchValue =
    getElementValue(
      "searchInput"
    )
      .toLowerCase();


  const stageValue =
    getElementValue(
      "stageFilter"
    )
      .toUpperCase();


  const icpValue =
    getElementValue(
      "icpFilter"
    )
      .toUpperCase();


  const researchValue =
    getElementValue(
      "researchStatusFilter"
    )
      .toUpperCase();


  const actionValue =
    getElementValue(
      "nextActionTypeFilter"
    )
      .toUpperCase();


  const responsibleValue =
    getElementValue(
      "responsibleFilter"
    )
      .toLowerCase();


  let filtered =
    CRM_STATE.leads
      .filter(
        lead => {

          const searchable =
            [
              lead.Company_name,
              lead.Founder_1_name,
              lead.Lead_id,
              lead.Website,
              lead.Responsible_email,
              lead.Responsible_name
            ]
              .join(" ")
              .toLowerCase();


          const matchesSearch =
            !searchValue ||
            searchable.includes(
              searchValue
            );


          const matchesStage =
            !stageValue ||
            String(
              lead.Pipeline_stage || ""
            ).toUpperCase() ===
              stageValue;


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
            matchesStage &&
            matchesIcp &&
            matchesResearch &&
            matchesAction &&
            matchesResponsible
          );
        }
      );


  filtered =
    sortCrmLeads(
      filtered
    );


  CRM_STATE.filteredLeads =
    filtered;


  renderLeadTable(
    filtered
  );


  updateLeadCount(
    filtered.length
  );
}


/* =========================================================
 * SORTING
 * ========================================================= */

function sortCrmLeads(
  leads
) {

  const order =
    getElementValue(
      "listOrder"
    ) ||
    "newest";


  const sorted =
    [...leads];


  sorted.sort(
    (a, b) => {

      switch (order) {

        case "oldest":

          return compareCrmDates(
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

          return compareCrmDates(
            a.Next_action_at,
            b.Next_action_at,
            "asc"
          );


        case "next_action_desc":

          return compareCrmDates(
            a.Next_action_at,
            b.Next_action_at,
            "desc"
          );


        case "last_action_asc":

          return compareCrmDates(
            getLastActionDate(a),
            getLastActionDate(b),
            "asc"
          );


        case "last_action_desc":

          return compareCrmDates(
            getLastActionDate(a),
            getLastActionDate(b),
            "desc"
          );


        case "newest":
        default:

          return compareCrmDates(
            a.Company_lead,
            b.Company_lead,
            "desc"
          );
      }
    }
  );


  return sorted;
}


function compareCrmDates(
  valueA,
  valueB,
  direction
) {

  const timeA =
    parseCrmDateTime(
      valueA
    );


  const timeB =
    parseCrmDateTime(
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
 * LAST ACTION
 * ========================================================= */

function getLastActionDate(
  lead
) {

  let newest =
    null;


  CRM_LAST_ACTION_FIELDS
    .forEach(
      field => {

        const timestamp =
          parseCrmDateTime(
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
 * TABLE
 * ========================================================= */

function renderLeadTable(
  leads
) {

  const tbody =
    document.getElementById(
      "leadTableBody"
    );


  if (!tbody) {
    return;
  }


  tbody.innerHTML =
    "";


  if (
    !Array.isArray(leads) ||
    !leads.length
  ) {

    tbody.innerHTML = `

      <tr>

        <td
          colspan="6"
          class="empty-table-cell"
        >
          No leads match the current filters.
        </td>

      </tr>
    `;


    return;
  }


  leads.forEach(
    lead => {

      const row =
        document.createElement(
          "tr"
        );


      row.className =
        "lead-row";


      row.dataset.leadId =
        lead.Lead_id;


      if (
        lead.Lead_id ===
        CRM_STATE.selectedLeadId
      ) {

        row.classList.add(
          "selected"
        );
      }


      const lastAction =
        getLastActionDate(
          lead
        );


      row.innerHTML = `

        <td class="col-company">

          <div class="company-cell">

            <strong>

              ${escapeHtml(
                lead.Company_name ||
                "Unnamed company"
              )}

            </strong>

            <span>

              ${escapeHtml(
                lead.Lead_id || ""
              )}

            </span>

          </div>

        </td>


        <td class="col-founder">

          ${escapeHtml(
            lead.Founder_1_name ||
            "—"
          )}

        </td>


        <td class="col-stage">

          ${renderCrmBadge(
            lead.Pipeline_stage,
            "stage"
          )}

        </td>


        <td class="col-next-action-date">

          ${escapeHtml(
            formatCrmDate(
              lead.Next_action_at
            )
          )}

        </td>


        <td class="col-next-action">

          ${
            lead.Next_action_type

              ? escapeHtml(
                  formatCrmLabel(
                    lead.Next_action_type
                  )
                )

              : '<span class="muted-text">—</span>'
          }

        </td>


        <td class="col-last-action-date">

          ${escapeHtml(
            formatCrmDate(
              lastAction
            )
          )}

        </td>
      `;


      row.addEventListener(
        "click",
        () =>
          selectCrmLead(
            lead.Lead_id
          )
      );


      tbody.appendChild(
        row
      );
    }
  );
}


/* =========================================================
 * SELECT LEAD
 * ========================================================= */

async function selectCrmLead(
  leadId
) {

  if (!leadId) {
    return;
  }


  CRM_STATE.selectedLeadId =
    leadId;


  CRM_STATE.pendingUpdates =
    {};


  CRM_STATE.editingField =
    null;


  renderLeadTable(
    CRM_STATE.filteredLeads
  );


  /*
   * If this Lead has already been loaded,
   * render it immediately.
   */
  const cachedRecord =
    getStoredCrmLead(
      leadId
    );


  if (
    cachedRecord &&
    cachedRecord.value
  ) {

    CRM_STATE.selectedLead =
      cachedRecord.value;


    renderLeadDetail(
      cachedRecord.value
    );

  } else {

    renderLeadDetailLoading();
  }


  try {

    /*
     * Fresh cached record:
     * resolves immediately.
     *
     * Stale / missing record:
     * fetches API and updates cache.
     */
    const lead =
      await getCachedCrmLead(
        leadId
      );


    if (!lead) {

      throw new Error(
        "Lead record was not returned."
      );
    }


    CRM_STATE.selectedLead =
      lead;


    renderLeadDetail(
      lead
    );


  } catch (error) {

    console.error(error);


    /*
     * If stale cache was already rendered,
     * don't destroy usable information.
     */
    if (
      !cachedRecord ||
      !cachedRecord.value
    ) {

      renderLeadDetailError(
        error.message
      );
    }
  }
}


/* =========================================================
 * ACCEPT UPDATED LEAD
 * ========================================================= */

function acceptUpdatedLead(
  updatedLead
) {

  if (!updatedLead) {
    return;
  }


  CRM_STATE.selectedLead =
    updatedLead;


  /*
   * Synchronize browser cache immediately.
   */
  acceptCrmLeadIntoCache(
    updatedLead
  );


  const index =
    CRM_STATE.leads
      .findIndex(
        lead =>
          lead.Lead_id ===
          updatedLead.Lead_id
      );


  if (
    index !== -1
  ) {

    CRM_STATE.leads[index] = {

      ...CRM_STATE.leads[index],

      ...updatedLead
    };
  }


  applyLeadFilters();
}


/* =========================================================
 * STATUS
 * ========================================================= */

function updateLeadCount(
  count
) {

  const element =
    document.getElementById(
      "leadCount"
    );


  if (element) {

    element.textContent =
      `${count} lead${
        count === 1
          ? ""
          : "s"
      }`;
  }
}


function showCrmStatus(
  message,
  type = "info"
) {

  const panel =
    document.getElementById(
      "statusPanel"
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


function hideCrmStatus() {

  const panel =
    document.getElementById(
      "statusPanel"
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
 * GENERIC PAGE HELPER
 * ========================================================= */

function getElementValue(
  id
) {

  return String(
    document
      .getElementById(id)
      ?.value || ""
  ).trim();
}
