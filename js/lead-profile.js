/**
 * Business Canvas CRM
 * Lead Profile page controller
 *
 * Optimized loading:
 *
 * /lead
 *   -> zero API calls
 *
 * /lead?lead=LEAD-xxxxx
 *   -> load selected Lead + metadata in parallel
 *
 * Search
 *   -> load Lead list lazily on first search only
 */


/* =========================================================
 * STATE
 * ========================================================= */

let LEAD_PROFILE_STATE = {

  leads: [],

  leadsLoaded: false,
  leadsLoadingPromise: null,

  selectedLeadId: null,
  selectedLead: null,

  meta: null,
  metaLoadingPromise: null,

  pendingUpdates: {},

  editingField: null,

  workflowBusy: false
};


/* =========================================================
 * SHARED LEAD DETAIL CONFIG
 * ========================================================= */

configureLeadDetail({

  panelId:
    "leadProfileDetail",


  getState:
    () =>
      LEAD_PROFILE_STATE,


  onLeadUpdated:
    updatedLead =>
      acceptLeadProfileUpdate(
        updatedLead
      ),


  showStatus:
    (message, type) =>
      showLeadProfileStatus(
        message,
        type
      )
});


/* =========================================================
 * INIT
 * ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  initializeLeadProfile
);


async function initializeLeadProfile() {

  bindLeadProfileEvents();


  /*
   * IMPORTANT:
   *
   * Do NOT load:
   * - metadata
   * - lead list
   *
   * unless they are actually needed.
   */
  const leadId =
    getLeadIdFromProfileUrl();


  /*
   * Empty Lead Profile page.
   *
   * Zero API calls.
   */
  if (!leadId) {

    hideLeadProfileStatus();

    return;
  }


  /*
   * Direct Lead Profile opening.
   *
   * Load only:
   * - requested Lead
   * - metadata needed by editable fields
   *
   * Both requests happen in parallel.
   */
  await selectLeadProfileLead(
    leadId
  );
}


/* =========================================================
 * GLOBAL EVENTS
 * ========================================================= */

function bindLeadProfileEvents() {

  const searchInput =
    document.getElementById(
      "leadProfileSearchInput"
    );


  searchInput
    ?.addEventListener(
      "input",
      handleLeadProfileSearch
    );


  searchInput
    ?.addEventListener(
      "focus",
      async () => {

        if (
          searchInput.value.trim()
        ) {

          await handleLeadProfileSearch();
        }
      }
    );


  searchInput
    ?.addEventListener(
      "keydown",
      async event => {

        if (
          event.key !== "Enter"
        ) {

          return;
        }


        const query =
          String(
            searchInput.value || ""
          )
            .trim()
            .toLowerCase();


        if (!query) {
          return;
        }


        await ensureLeadListLoaded();


        const exactOrFirst =
          findBestLeadMatch(
            query
          );


        if (!exactOrFirst) {
          return;
        }


        event.preventDefault();


        hideLeadProfileSearchResults();


        await selectLeadProfileLead(
          exactOrFirst.Lead_id
        );
      }
    );


  document.addEventListener(
    "click",
    event => {

      const searchWrap =
        document.querySelector(
          ".lead-profile-search-wrap"
        );


      if (
        searchWrap &&
        !searchWrap.contains(
          event.target
        )
      ) {

        hideLeadProfileSearchResults();
      }
    }
  );


  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Escape"
      ) {

        hideLeadProfileSearchResults();
      }
    }
  );
}


/* =========================================================
 * URL
 * ========================================================= */

function getLeadIdFromProfileUrl() {

  const params =
    new URLSearchParams(
      window.location.search
    );


  return String(
    params.get("lead") || ""
  ).trim();
}


function updateLeadProfileUrl(
  leadId
) {

  if (!leadId) {
    return;
  }


  const url =
    new URL(
      window.location.href
    );


  url.searchParams.set(
    "lead",
    leadId
  );


  window.history.replaceState(
    {},
    document.title,
    url.toString()
  );
}


/* =========================================================
 * LAZY METADATA
 * ========================================================= */

async function ensureLeadProfileMetaLoaded() {

  if (
    LEAD_PROFILE_STATE.meta
  ) {

    return LEAD_PROFILE_STATE.meta;
  }


  /*
   * Reuse the same request if another
   * operation already started it.
   */
  if (
    LEAD_PROFILE_STATE
      .metaLoadingPromise
  ) {

    return LEAD_PROFILE_STATE
      .metaLoadingPromise;
  }


  LEAD_PROFILE_STATE
    .metaLoadingPromise =
      getCrmMeta()
        .then(
          meta => {

            LEAD_PROFILE_STATE.meta =
              meta;


            return meta;
          }
        )
        .catch(
          error => {

            console.error(
              "Could not load CRM metadata.",
              error
            );


            return null;
          }
        )
        .finally(
          () => {

            LEAD_PROFILE_STATE
              .metaLoadingPromise =
                null;
          }
        );


  return LEAD_PROFILE_STATE
    .metaLoadingPromise;
}


/* =========================================================
 * LAZY LEAD LIST
 * ========================================================= */

async function ensureLeadListLoaded() {

  if (
    LEAD_PROFILE_STATE.leadsLoaded
  ) {

    return LEAD_PROFILE_STATE.leads;
  }


  /*
   * If a search request is already running,
   * reuse it instead of creating another.
   */
  if (
    LEAD_PROFILE_STATE
      .leadsLoadingPromise
  ) {

    return LEAD_PROFILE_STATE
      .leadsLoadingPromise;
  }


  LEAD_PROFILE_STATE
    .leadsLoadingPromise =
      getCrmLeads()
        .then(
          leads => {

            LEAD_PROFILE_STATE.leads =
              Array.isArray(leads)
                ? leads
                : [];


            LEAD_PROFILE_STATE
              .leadsLoaded =
                true;


            return LEAD_PROFILE_STATE
              .leads;
          }
        )
        .finally(
          () => {

            LEAD_PROFILE_STATE
              .leadsLoadingPromise =
                null;
          }
        );


  return LEAD_PROFILE_STATE
    .leadsLoadingPromise;
}


/* =========================================================
 * SEARCH
 * ========================================================= */

async function handleLeadProfileSearch() {

  const input =
    document.getElementById(
      "leadProfileSearchInput"
    );


  const resultsPanel =
    document.getElementById(
      "leadProfileSearchResults"
    );


  if (
    !input ||
    !resultsPanel
  ) {

    return;
  }


  const query =
    String(
      input.value || ""
    )
      .trim()
      .toLowerCase();


  if (!query) {

    hideLeadProfileSearchResults();

    return;
  }


  /*
   * Lead database is loaded only when
   * autocomplete is actually used.
   */
  try {

    await ensureLeadListLoaded();

  } catch (error) {

    console.error(error);


    renderLeadProfileSearchLoadError();

    return;
  }


  /*
   * The user may have changed the text
   * while the list was loading.
   */
  const currentQuery =
    String(
      input.value || ""
    )
      .trim()
      .toLowerCase();


  if (!currentQuery) {

    hideLeadProfileSearchResults();

    return;
  }


  const matches =
    getLeadProfileMatches(
      currentQuery
    )
      .slice(
        0,
        10
      );


  renderLeadProfileSearchResults(
    matches,
    currentQuery
  );
}


function getLeadProfileMatches(
  query
) {

  return LEAD_PROFILE_STATE.leads
    .filter(
      lead => {

        const company =
          String(
            lead.Company_name || ""
          ).toLowerCase();


        const founder =
          String(
            lead.Founder_1_name || ""
          ).toLowerCase();


        const leadId =
          String(
            lead.Lead_id || ""
          ).toLowerCase();


        return (
          company.includes(query) ||
          founder.includes(query) ||
          leadId.includes(query)
        );
      }
    )
    .sort(
      (a, b) =>
        String(
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
        )
    );
}


function findBestLeadMatch(
  query
) {

  const matches =
    getLeadProfileMatches(
      query
    );


  if (!matches.length) {
    return null;
  }


  const exact =
    matches.find(
      lead => {

        return (
          String(
            lead.Company_name || ""
          )
            .trim()
            .toLowerCase() === query
          ||
          String(
            lead.Founder_1_name || ""
          )
            .trim()
            .toLowerCase() === query
          ||
          String(
            lead.Lead_id || ""
          )
            .trim()
            .toLowerCase() === query
        );
      }
    );


  return exact || matches[0];
}


/* =========================================================
 * SEARCH RESULTS
 * ========================================================= */

function renderLeadProfileSearchResults(
  leads,
  query
) {

  const resultsPanel =
    document.getElementById(
      "leadProfileSearchResults"
    );


  if (!resultsPanel) {
    return;
  }


  resultsPanel.hidden =
    false;


  if (!leads.length) {

    resultsPanel.innerHTML = `

      <div class="lead-profile-search-empty">

        No leads found for
        <strong>
          ${escapeHtml(query)}
        </strong>

      </div>
    `;


    return;
  }


  resultsPanel.innerHTML =
    leads
      .map(
        lead => `

          <button
            type="button"
            class="lead-profile-search-result"
            data-lead-profile-result="${escapeHtmlAttribute(
              lead.Lead_id
            )}"
          >

            <span class="lead-profile-search-result-main">

              <strong>

                ${escapeHtml(
                  lead.Company_name ||
                  "Unnamed company"
                )}

              </strong>


              <small>

                ${escapeHtml(
                  lead.Founder_1_name ||
                  "No founder"
                )}

              </small>

            </span>


            <span class="lead-profile-search-result-meta">

              ${escapeHtml(
                lead.Lead_id || ""
              )}

            </span>

          </button>
        `
      )
      .join("");


  resultsPanel
    .querySelectorAll(
      "[data-lead-profile-result]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          async () => {

            const leadId =
              button.dataset
                .leadProfileResult;


            if (!leadId) {
              return;
            }


            hideLeadProfileSearchResults();


            await selectLeadProfileLead(
              leadId
            );
          }
        );
      }
    );
}


function renderLeadProfileSearchLoadError() {

  const resultsPanel =
    document.getElementById(
      "leadProfileSearchResults"
    );


  if (!resultsPanel) {
    return;
  }


  resultsPanel.hidden =
    false;


  resultsPanel.innerHTML = `

    <div class="lead-profile-search-empty">

      Could not load leads.

    </div>
  `;
}


function hideLeadProfileSearchResults() {

  const resultsPanel =
    document.getElementById(
      "leadProfileSearchResults"
    );


  if (!resultsPanel) {
    return;
  }


  resultsPanel.hidden =
    true;


  resultsPanel.innerHTML =
    "";
}


/* =========================================================
 * SELECT LEAD
 * ========================================================= */

async function selectLeadProfileLead(
  leadId
) {

  if (!leadId) {
    return;
  }


  LEAD_PROFILE_STATE.selectedLeadId =
    leadId;


  LEAD_PROFILE_STATE.selectedLead =
    null;


  LEAD_PROFILE_STATE.pendingUpdates =
    {};


  LEAD_PROFILE_STATE.editingField =
    null;


  renderLeadProfileLoading();


  try {

    /*
     * Load the selected Lead and metadata
     * simultaneously.
     *
     * This removes the old:
     *
     * getCrmMeta()
     *   ↓
     * getCrmLeads()
     *   ↓
     * getCrmLead()
     *
     * sequential chain.
     */
    const [
      lead
    ] =
      await Promise.all([

        getCrmLead(
          leadId
        ),

        ensureLeadProfileMetaLoaded()
      ]);


    if (!lead) {

      throw new Error(
        "Lead record was not returned."
      );
    }


    LEAD_PROFILE_STATE.selectedLead =
      lead;


    updateLeadProfileUrl(
      leadId
    );


    document.title =
      `${lead.Company_name || leadId} — Business Canvas CRM`;


    const searchInput =
      document.getElementById(
        "leadProfileSearchInput"
      );


    if (searchInput) {

      searchInput.value =
        lead.Company_name ||
        "";
    }


    renderLeadDetail(
      lead
    );


    renderActivityPlaceholder(
      lead
    );


    hideLeadProfileStatus();


  } catch (error) {

    console.error(error);


    renderLeadProfileError(
      error.message
    );


    showLeadProfileStatus(
      "Could not load lead: " +
      error.message,
      "error"
    );
  }
}


/* =========================================================
 * UPDATED LEAD
 * ========================================================= */

function acceptLeadProfileUpdate(
  updatedLead
) {

  if (!updatedLead) {
    return;
  }


  LEAD_PROFILE_STATE.selectedLead =
    updatedLead;


  LEAD_PROFILE_STATE.selectedLeadId =
    updatedLead.Lead_id;


  /*
   * Update search cache only if that cache
   * has actually been loaded.
   */
  if (
    LEAD_PROFILE_STATE.leadsLoaded
  ) {

    const index =
      LEAD_PROFILE_STATE.leads
        .findIndex(
          lead =>
            lead.Lead_id ===
            updatedLead.Lead_id
        );


    if (
      index !== -1
    ) {

      LEAD_PROFILE_STATE.leads[
        index
      ] = {

        ...LEAD_PROFILE_STATE.leads[
          index
        ],

        ...updatedLead
      };

    } else {

      LEAD_PROFILE_STATE.leads.push(
        updatedLead
      );
    }
  }


  document.title =
    `${updatedLead.Company_name ||
      updatedLead.Lead_id ||
      "Lead Profile"} — Business Canvas CRM`;


  const searchInput =
    document.getElementById(
      "leadProfileSearchInput"
    );


  if (searchInput) {

    searchInput.value =
      updatedLead.Company_name ||
      "";
  }
}


/* =========================================================
 * PROFILE LOADING
 * ========================================================= */

function renderLeadProfileLoading() {

  const panel =
    document.getElementById(
      "leadProfileDetail"
    );


  if (!panel) {
    return;
  }


  panel.innerHTML = `

    <div class="detail-empty-state">

      <h2>
        Loading lead...
      </h2>

      <p>
        Retrieving complete CRM information.
      </p>

    </div>
  `;
}


/* =========================================================
 * PROFILE ERROR
 * ========================================================= */

function renderLeadProfileError(
  message
) {

  const panel =
    document.getElementById(
      "leadProfileDetail"
    );


  if (!panel) {
    return;
  }


  panel.innerHTML = `

    <div class="detail-empty-state">

      <h2>
        Could not load lead
      </h2>

      <p>

        ${escapeHtml(
          message ||
          "Unknown CRM error."
        )}

      </p>

    </div>
  `;
}


/* =========================================================
 * ACTIVITY PLACEHOLDER
 * ========================================================= */

function renderActivityPlaceholder(
  lead
) {

  const count =
    document.getElementById(
      "leadProfileActivityCount"
    );


  const body =
    document.getElementById(
      "leadProfileActivityBody"
    );


  if (count) {

    count.textContent =
      lead.Company_name ||
      lead.Lead_id ||
      "Selected lead";
  }


  if (!body) {
    return;
  }


  body.innerHTML = `

    <div class="lead-profile-activity-empty">

      <h3>
        Activity log
      </h3>

      <p>
        Historical activities for this lead will be connected here next.
      </p>

    </div>
  `;
}


/* =========================================================
 * STATUS
 * ========================================================= */

function showLeadProfileStatus(
  message,
  type = "info"
) {

  const panel =
    document.getElementById(
      "leadProfileStatusPanel"
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


function hideLeadProfileStatus() {

  const panel =
    document.getElementById(
      "leadProfileStatusPanel"
    );


  if (!panel) {
    return;
  }


  panel.hidden =
    true;


  panel.textContent =
    "";
}
