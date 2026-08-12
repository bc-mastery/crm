/**
 * Business Canvas CRM
 * Main frontend application logic
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


  try {

    CRM_STATE.meta =
      await getCrmMeta();

  } catch (error) {

    console.error(
      "Could not load CRM metadata.",
      error
    );
  }


  await loadCrmLeads();


  /*
   * If the Leads page was opened from the Pipeline,
   * automatically open the requested lead.
   */
  await openLeadFromUrl();
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


  /*
   * Make sure this lead is actually available
   * to the authenticated CRM user.
   *
   * This is especially important for consultants,
   * because their lead list is permission-filtered
   * by the backend.
   */
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


  /*
   * Open the complete Lead card.
   */
  await selectCrmLead(
    leadId
  );


  /*
   * Bring the selected lead into view
   * inside the independently scrollable
   * Leads list.
   */
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


  /*
   * Remove ?lead=... after opening it.
   *
   * This means a later Refresh will not
   * unexpectedly reopen the original lead.
   */
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

async function loadCrmLeads() {

  showCrmStatus(
    "Loading leads..."
  );


  try {

    const leads =
      await getCrmLeads();


    CRM_STATE.leads =
      leads;


    populateAllFilters(
      leads
    );


    applyLeadFilters();


    hideCrmStatus();


  } catch (error) {

    console.error(error);


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


        try {

          CRM_STATE.meta =
            await getCrmMeta();

        } catch (error) {

          console.error(error);
        }


        await loadCrmLeads();
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
    ].sort(
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
    CRM_STATE.leads.filter(
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
              sensitivity: "base"
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


  /*
   * Empty dates always go to the bottom.
   */
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

        const value =
          lead[field];


        const timestamp =
          parseCrmDateTime(
            value
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


  renderLeadDetailLoading();


  try {

    const lead =
      await getCrmLead(
        leadId
      );


    CRM_STATE.selectedLead =
      lead;


    renderLeadDetail(
      lead
    );


  } catch (error) {

    console.error(error);


    renderLeadDetailError(
      error.message
    );
  }
}


/* =========================================================
 * DETAIL
 * ========================================================= */

function renderLeadDetail(
  lead
) {

  const panel =
    document.getElementById(
      "leadDetail"
    );


  if (!panel) {
    return;
  }


  /*
   * Preserve the current internal scroll position
   * whenever the same Lead card is re-rendered.
   */
  const previousScrollBody =
    panel.querySelector(
      ".detail-scroll-body"
    );


  const previousScrollTop =
    previousScrollBody
      ? previousScrollBody.scrollTop
      : 0;


  panel.className =
    "detail-panel";


  if (!panel) {
    return;
  }


  panel.className =
    "detail-panel";


  const isManager =
    CRM_STATE.meta
      ?.user
      ?.role ===
        "manager";


  panel.innerHTML = `

    <div class="detail-fixed-top">

      <div class="detail-header">

        <div>

          <span class="detail-eyebrow">

            ${escapeHtml(
              lead.Lead_id || ""
            )}

          </span>

          <h2>

            ${escapeHtml(
              lead.Company_name ||
              "Unnamed company"
            )}

          </h2>

        </div>


        <div class="detail-stage">

          ${renderCrmBadge(
            lead.Pipeline_stage,
            "stage"
          )}

        </div>

      </div>


      ${renderSaveBar()}

    </div>


    <div class="detail-scroll-body">


      <div class="detail-section">

        <h3>Company</h3>

        ${renderEditableField({

          label:
            "Website",

          field:
            "Website",

          value:
            lead.Website,

          type:
            "url"
        })}


        ${renderReadOnlyField(
          "Clutch",
          lead.Clutch_url,
          true
        )}


        ${renderReadOnlyField(
          "Location",
          combineLocation(
            lead.Location,
            lead.Country
          )
        )}


        ${renderReadOnlyField(
          "Manpower",
          lead.Manpower
        )}


        ${renderReadOnlyField(
          "Project size",
          lead.Project_size
        )}

      </div>


      <div class="detail-section">

        <h3>Founder</h3>

        ${renderEditableField({

          label:
            "Name",

          field:
            "Founder_1_name",

          value:
            lead.Founder_1_name
        })}


        ${renderEditableField({

          label:
            "LinkedIn",

          field:
            "Founder_1_LinkedIn",

          value:
            lead.Founder_1_LinkedIn,

          type:
            "url"
        })}


        ${renderEditableField({

          label:
            "Email",

          field:
            "Founder_1_email",

          value:
            lead.Founder_1_email,

          type:
            "email"
        })}

      </div>


      <div class="detail-section">

        <h3>Research notes</h3>

        ${renderTextBlock(
          "Targeting",
          lead.T_issue
        )}

        ${renderTextBlock(
          "Offer",
          lead.O_issue
        )}

        ${renderTextBlock(
          "Marketing",
          lead.M_issue
        )}

        ${renderTextBlock(
          "Sales",
          lead.S_issue
        )}

        ${renderTextBlock(
          "Outreach angle",
          lead.Outreach_angle
        )}

      </div>


      <div class="detail-section">

        <h3>Qualification</h3>

        ${renderReadOnlyField(
          "ICP fit",
          lead.ICP_fit_level
        )}


        ${renderReadOnlyField(
          "Research status",
          lead.Research_status
        )}


        ${
          isManager

            ? renderResponsibleField(
                lead
              )

            : renderReadOnlyField(
                "Responsible",
                lead.Responsible_name ||
                lead.Responsible_email
              )
        }


        ${renderReadOnlyField(
          "Pipeline stage",
          lead.Pipeline_stage
        )}

      </div>


      <div class="detail-section">

        <h3>Next action</h3>

        ${renderNextActionTypeField(
          lead
        )}


        ${renderEditableField({

          label:
            "Due",

          field:
            "Next_action_at",

          value:
            lead.Next_action_at,

          type:
            "datetime-local"
        })}

      </div>


      <div class="detail-section">

        <h3>Contact progress</h3>

        <div class="milestone-stack">

          ${renderMilestoneButton(
            lead,
            "CR",
            "Connection request sent",
            "Connection_request_sent"
          )}

          ${renderMilestoneButton(
            lead,
            "CA",
            "Connection accepted",
            "Connection_accepted"
          )}

          ${renderMilestoneButton(
            lead,
            "MS",
            "Message sent",
            "Message_sent"
          )}

          ${renderMilestoneButton(
            lead,
            "RT",
            "Responded",
            "Response_time"
          )}

        </div>

        <p class="milestone-help">
          Double-click a stage to change its status.
        </p>

      </div>


      <div class="detail-section">

        <h3>Deal progress</h3>

        <div class="milestone-stack">

          ${renderMilestoneButton(
            lead,
            "REVIEW_CALL_OFFERED",
            "Review Call Offered",
            "RC_offered_time",
            "Review Call Offered"
          )}

          ${renderMilestoneButton(
            lead,
            "REVIEW_CALL_BOOKED",
            "Review Call Booked",
            "RC_booked_time",
            "Review Call Booked"
          )}

          ${renderMilestoneButton(
            lead,
            "GS_SENT",
            "GS Sent",
            "GS_sent_time",
            "GS Sent"
          )}

          ${renderMilestoneButton(
            lead,
            "GS_COMPLETED",
            "GS Completed",
            "GS_completed_time",
            "GS Completed"
          )}

          ${renderMilestoneButton(
            lead,
            "REVIEW_CALL_DONE",
            "Review Call Done",
            "RC_done_time",
            "Review Call Done"
          )}

          ${renderMilestoneButton(
            lead,
            "PROPOSAL_SENT",
            "Proposal Sent",
            "Proposal_time",
            "Proposal Sent"
          )}

        </div>

        <p class="milestone-help">
          Double-click a stage to change its status.
        </p>

      </div>


      <div class="detail-section outcome-section">

        <h3>Outcome</h3>

        <div class="outcome-actions">

          ${renderOutcomeButton(
            "WON",
            "Won",
            lead.Won,
            lead.Won_time
          )}

          ${renderOutcomeButton(
            "LOST",
            "Lost",
            lead.Lost,
            lead.Lost_time
          )}

        </div>

        <p class="milestone-help">
          Double-click an outcome to confirm it.
        </p>

      </div>


      ${renderOptionalEditableText(
        "Conclusion",
        "Conclusion",
        lead.Conclusion
      )}


      ${renderOptionalEditableText(
        "Response",
        "Response content",
        lead["Response content"]
      )}


      <div class="detail-section archive-section">

        <h3>Record status</h3>

        <div class="archive-row">

          <div>

            <strong>

              ${
                normalizeCrmBoolean(
                  lead.Is_archived
                )

                  ? "Archived"

                  : "Active record"
              }

            </strong>

            <p>

              ${
                normalizeCrmBoolean(
                  lead.Is_archived
                )

                  ? "This lead is currently archived."

                  : "Archive only when this record should no longer remain active."
              }

            </p>

          </div>


          <button
            type="button"
            class="archive-button"
            data-archive-toggle
          >

            ${
              normalizeCrmBoolean(
                lead.Is_archived
              )

                ? "Unarchive"

                : "Archive"
            }

          </button>

        </div>

      </div>


    </div>
  `;


  bindLeadDetailEvents();


  /*
   * Restore the internal card scroll position
   * after the HTML has been recreated.
   */
  const newScrollBody =
    panel.querySelector(
      ".detail-scroll-body"
    );


  if (newScrollBody) {

    newScrollBody.scrollTop =
      previousScrollTop;
  }
}


/* =========================================================
 * EDITABLE FIELD
 * ========================================================= */

function renderEditableField({
  label,
  field,
  value,
  type = "text",
  options = null
}) {

  const editing =
    CRM_STATE.editingField ===
      field;


  const hasPending =
    Object.prototype
      .hasOwnProperty
      .call(
        CRM_STATE.pendingUpdates,
        field
      );


  const currentValue =
    hasPending

      ? CRM_STATE
          .pendingUpdates[
            field
          ]

      : value;


  if (!editing) {

    const display =
      type ===
        "datetime-local"

        ? formatCrmDateTime(
            currentValue
          )

        : currentValue;


    return renderDisplayField(
      label,
      field,
      display,
      type === "url"
    );
  }


  let control;


  if (
    Array.isArray(options)
  ) {

    control = `

      <select
        class="crm-inline-input"
        data-edit-input
        data-field="${escapeHtmlAttribute(
          field
        )}"
      >

        <option value="">
          —
        </option>

        ${options
          .map(
            option => `

              <option
                value="${escapeHtmlAttribute(
                  option.value
                )}"
                ${
                  String(
                    option.value
                  ) ===
                  String(
                    currentValue ||
                    ""
                  )

                    ? "selected"

                    : ""
                }
              >

                ${escapeHtml(
                  option.label
                )}

              </option>
            `
          )
          .join("")}

      </select>
    `;


  } else if (
    type === "textarea"
  ) {

    control = `

      <textarea
        class="crm-inline-input crm-inline-textarea"
        data-edit-input
        data-field="${escapeHtmlAttribute(
          field
        )}"
      >${escapeHtml(
        currentValue || ""
      )}</textarea>
    `;


  } else {

    const inputValue =
      type ===
        "datetime-local"

        ? formatDateTimeLocalValue(
            currentValue
          )

        : currentValue || "";


    control = `

      <input
        class="crm-inline-input"
        type="${escapeHtmlAttribute(
          type
        )}"
        value="${escapeHtmlAttribute(
          inputValue
        )}"
        data-edit-input
        data-field="${escapeHtmlAttribute(
          field
        )}"
      />
    `;
  }


  return `

    <div class="detail-field detail-field-editing">

      <span class="detail-label">

        ${escapeHtml(
          label
        )}

      </span>


      <div class="detail-edit-wrap">

        ${control}

        <button
          type="button"
          class="field-edit-cancel"
          data-cancel-edit
          title="Cancel editing"
        >
          ×
        </button>

      </div>

    </div>
  `;
}


/* =========================================================
 * DISPLAY EDITABLE FIELD
 * ========================================================= */

function renderDisplayField(
  label,
  field,
  value,
  asLink = false
) {

  const clean =
    value === null ||
    value === undefined ||
    value === ""

      ? "—"

      : String(value);


  let content =
    escapeHtml(clean);


  if (
    asLink &&
    clean !== "—"
  ) {

    content = `

      <a
        href="${escapeHtmlAttribute(
          clean
        )}"
        target="_blank"
        rel="noopener noreferrer"
      >

        ${escapeHtml(clean)}

      </a>
    `;
  }


  return `

    <div class="detail-field">

      <span class="detail-label">

        ${escapeHtml(label)}

      </span>


      <div class="detail-display-editable">

        <div class="detail-value">

          ${content}

        </div>


        <button
          type="button"
          class="field-edit-button"
          data-edit-field="${escapeHtmlAttribute(
            field
          )}"
          title="Edit"
          aria-label="Edit ${escapeHtmlAttribute(
            label
          )}"
        >
          ✎
        </button>

      </div>

    </div>
  `;
}


/* =========================================================
 * READ ONLY
 * ========================================================= */

function renderReadOnlyField(
  label,
  value,
  asLink = false
) {

  const clean =
    value === null ||
    value === undefined ||
    value === ""

      ? "—"

      : String(value);


  let content =
    escapeHtml(clean);


  if (
    asLink &&
    clean !== "—"
  ) {

    content = `

      <a
        href="${escapeHtmlAttribute(
          clean
        )}"
        target="_blank"
        rel="noopener noreferrer"
      >

        ${escapeHtml(clean)}

      </a>
    `;
  }


  return `

    <div class="detail-field">

      <span class="detail-label">

        ${escapeHtml(label)}

      </span>

      <div class="detail-value">

        ${content}

      </div>

    </div>
  `;
}


/* =========================================================
 * RESPONSIBLE
 * ========================================================= */

function renderResponsibleField(
  lead
) {

  const users =
    CRM_STATE.meta
      ?.responsibleUsers ||
    [];


  const options =
    users.map(
      user => ({
        value:
          user.email,

        label:
          user.name ||
          user.email
      })
    );


  const editing =
    CRM_STATE.editingField ===
      "Responsible_email";


  if (!editing) {

    return `

      <div class="detail-field">

        <span class="detail-label">
          Responsible
        </span>

        <div class="detail-display-editable">

          <div class="detail-value">

            ${escapeHtml(
              lead.Responsible_name ||
              lead.Responsible_email ||
              "—"
            )}

          </div>


          <button
            type="button"
            class="field-edit-button"
            data-edit-field="Responsible_email"
            title="Reassign lead"
          >
            ✎
          </button>

        </div>

      </div>
    `;
  }


  return renderEditableField({

    label:
      "Responsible",

    field:
      "Responsible_email",

    value:
      lead.Responsible_email,

    options:
      options
  });
}


/* =========================================================
 * NEXT ACTION TYPE
 * ========================================================= */

function renderNextActionTypeField(
  lead
) {

  const values =
    CRM_STATE.meta
      ?.nextActionTypes ||
    [];


  const options =
    values.map(
      value => ({
        value:
          value,

        label:
          formatCrmLabel(
            value
          )
      })
    );


  return renderEditableField({

    label:
      "Type",

    field:
      "Next_action_type",

    value:
      lead.Next_action_type,

    options:
      options
  });
}


/* =========================================================
 * OPTIONAL TEXT
 * ========================================================= */

function renderOptionalEditableText(
  heading,
  field,
  value
) {

  if (
    value === undefined
  ) {

    return "";
  }


  return `

    <div class="detail-section">

      <h3>
        ${escapeHtml(
          heading
        )}
      </h3>

      ${renderEditableField({

        label:
          heading,

        field:
          field,

        value:
          value,

        type:
          "textarea"
      })}

    </div>
  `;
}


/* =========================================================
 * SAVE BAR
 * ========================================================= */

function renderSaveBar() {

  const count =
    Object.keys(
      CRM_STATE.pendingUpdates
    ).length;


  return `

    <div class="lead-save-bar">

      <div class="lead-save-spacer">
      </div>


      <div class="lead-save-status-section">

        <span class="lead-save-status">

          ${
            count === 0

              ? "No unsaved changes"

              : `${count} unsaved change${
                  count === 1
                    ? ""
                    : "s"
                }`
          }

        </span>

      </div>


      <div class="lead-save-button-section">

        <button
          type="button"
          class="save-lead-button"
          data-save-lead
          ${
            count === 0
              ? "disabled"
              : ""
          }
        >
          Save changes
        </button>

      </div>

    </div>
  `;
}


/* =========================================================
 * MILESTONE
 * ========================================================= */

function renderMilestoneButton(
  lead,
  milestone,
  label,
  timestampField,
  checkboxField = null
) {

  const field =
    checkboxField ||
    milestone;


  const active =
    normalizeCrmBoolean(
      lead[field]
    );


  const timestamp =
    lead[
      timestampField
    ];


  return `

    <button
      type="button"
      class="milestone-button ${
        active
          ? "completed"
          : ""
      }"
      data-milestone="${escapeHtmlAttribute(
        milestone
      )}"
    >

      <span class="milestone-label">

        ${escapeHtml(label)}

      </span>


      ${
        active &&
        timestamp

          ? `

            <span class="milestone-time">

              ${escapeHtml(
                formatCrmDateTime(
                  timestamp
                )
              )}

            </span>
          `

          : ""
      }

    </button>
  `;
}


/* =========================================================
 * OUTCOME
 * ========================================================= */

function renderOutcomeButton(
  outcome,
  label,
  activeValue,
  timestamp
) {

  const active =
    normalizeCrmBoolean(
      activeValue
    );


  return `

    <button
      type="button"
      class="outcome-button outcome-${outcome.toLowerCase()} ${
        active
          ? "active"
          : ""
      }"
      data-outcome="${outcome}"
    >

      <span>
        ${escapeHtml(label)}
      </span>


      ${
        active &&
        timestamp

          ? `

            <small>

              ${escapeHtml(
                formatCrmDateTime(
                  timestamp
                )
              )}

            </small>
          `

          : ""
      }

    </button>
  `;
}


/* =========================================================
 * DETAIL EVENTS
 * ========================================================= */

function bindLeadDetailEvents() {

  const panel =
    document.getElementById(
      "leadDetail"
    );


  if (!panel) {
    return;
  }


  panel
    .querySelectorAll(
      "[data-edit-field]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            CRM_STATE.editingField =
              button.dataset.editField;


            renderLeadDetail(
              CRM_STATE.selectedLead
            );
          }
        );
      }
    );


  panel
    .querySelectorAll(
      "[data-cancel-edit]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            CRM_STATE.editingField =
              null;


            renderLeadDetail(
              CRM_STATE.selectedLead
            );
          }
        );
      }
    );


  panel
    .querySelectorAll(
      "[data-edit-input]"
    )
    .forEach(
      input => {

        const eventName =
          input.tagName ===
            "SELECT"

            ? "change"

            : "input";


        input.addEventListener(
          eventName,
          handleEditInputChange
        );
      }
    );


  panel
    .querySelector(
      "[data-save-lead]"
    )
    ?.addEventListener(
      "click",
      saveSelectedLeadChanges
    );


  panel
    .querySelectorAll(
      "[data-milestone]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "dblclick",
          async () => {

            await toggleSelectedMilestone(
              button.dataset.milestone
            );
          }
        );
      }
    );


  panel
    .querySelectorAll(
      "[data-outcome]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "dblclick",
          async () => {

            await setSelectedOutcome(
              button.dataset.outcome
            );
          }
        );
      }
    );


  panel
    .querySelector(
      "[data-archive-toggle]"
    )
    ?.addEventListener(
      "click",
      toggleArchive
    );
}


/* =========================================================
 * EDIT CHANGE
 * ========================================================= */

function handleEditInputChange(
  event
) {

  const field =
    event.target.dataset.field;


  if (!field) {
    return;
  }


  const newValue =
    event.target.value;


  const original =
    CRM_STATE.selectedLead[
      field
    ];


  if (
    normalizeComparableCrmValue(
      field,
      newValue
    ) ===
    normalizeComparableCrmValue(
      field,
      original
    )
  ) {

    delete CRM_STATE
      .pendingUpdates[
        field
      ];

  } else {

    CRM_STATE
      .pendingUpdates[
        field
      ] =
        newValue;
  }


  updateSaveBarOnly();
}


/* =========================================================
 * SAVE
 * ========================================================= */

async function saveSelectedLeadChanges() {

  const updates = {

    ...CRM_STATE
      .pendingUpdates
  };


  if (
    !CRM_STATE.selectedLeadId ||
    !Object.keys(updates).length
  ) {

    return;
  }


  setWorkflowBusy(
    true
  );


  try {

    const updatedLead =
      await updateCrmLead(
        CRM_STATE.selectedLeadId,
        updates
      );


    acceptUpdatedLead(
      updatedLead
    );


    CRM_STATE.pendingUpdates =
      {};


    CRM_STATE.editingField =
      null;


    renderLeadDetail(
      updatedLead
    );


  } catch (error) {

    console.error(error);


    showCrmStatus(
      "Could not save lead: " +
      error.message,
      "error"
    );


  } finally {

    setWorkflowBusy(
      false
    );
  }
}


/* =========================================================
 * MILESTONE ACTION
 * ========================================================= */

async function toggleSelectedMilestone(
  milestone
) {

  if (
    CRM_STATE.workflowBusy ||
    !CRM_STATE.selectedLeadId
  ) {

    return;
  }


  setWorkflowBusy(
    true
  );


  try {

    const updatedLead =
      await toggleCrmMilestone(
        CRM_STATE.selectedLeadId,
        milestone
      );


    acceptUpdatedLead(
      updatedLead
    );


    renderLeadDetail(
      updatedLead
    );


  } catch (error) {

    console.error(error);


    showCrmStatus(
      "Could not update milestone: " +
      error.message,
      "error"
    );


  } finally {

    setWorkflowBusy(
      false
    );
  }
}


/* =========================================================
 * OUTCOME
 * ========================================================= */

async function setSelectedOutcome(
  outcome
) {

  if (
    CRM_STATE.workflowBusy ||
    !CRM_STATE.selectedLeadId
  ) {

    return;
  }


  setWorkflowBusy(
    true
  );


  try {

    const updatedLead =
      await setCrmOutcome(
        CRM_STATE.selectedLeadId,
        outcome
      );


    acceptUpdatedLead(
      updatedLead
    );


    renderLeadDetail(
      updatedLead
    );


  } catch (error) {

    console.error(error);


    showCrmStatus(
      "Could not set outcome: " +
      error.message,
      "error"
    );


  } finally {

    setWorkflowBusy(
      false
    );
  }
}


/* =========================================================
 * ARCHIVE
 * ========================================================= */

async function toggleArchive() {

  if (
    CRM_STATE.workflowBusy ||
    !CRM_STATE.selectedLead
  ) {

    return;
  }


  setWorkflowBusy(
    true
  );


  try {

    const updatedLead =
      await updateCrmLead(
        CRM_STATE.selectedLeadId,
        {
          Is_archived:
            !normalizeCrmBoolean(
              CRM_STATE
                .selectedLead
                .Is_archived
            )
        }
      );


    acceptUpdatedLead(
      updatedLead
    );


    renderLeadDetail(
      updatedLead
    );


  } catch (error) {

    console.error(error);


    showCrmStatus(
      "Could not update archive status: " +
      error.message,
      "error"
    );


  } finally {

    setWorkflowBusy(
      false
    );
  }
}


/* =========================================================
 * ACCEPT UPDATED LEAD
 * ========================================================= */

function acceptUpdatedLead(
  updatedLead
) {

  CRM_STATE.selectedLead =
    updatedLead;


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
 * BUSY
 * ========================================================= */

function setWorkflowBusy(
  busy
) {

  CRM_STATE.workflowBusy =
    busy;


  document
    .getElementById(
      "leadDetail"
    )
    ?.classList
    .toggle(
      "workflow-busy",
      busy
    );
}


/* =========================================================
 * SAVE BAR UPDATE
 * ========================================================= */

function updateSaveBarOnly() {

  const bar =
    document.querySelector(
      ".lead-save-bar"
    );


  if (!bar) {
    return;
  }


  const count =
    Object.keys(
      CRM_STATE.pendingUpdates
    ).length;


  const status =
    bar.querySelector(
      ".lead-save-status"
    );


  const button =
    bar.querySelector(
      ".save-lead-button"
    );


  if (status) {

    status.textContent =
      count === 0

        ? "No unsaved changes"

        : `${count} unsaved change${
            count === 1
              ? ""
              : "s"
          }`;
  }


  if (button) {

    button.disabled =
      count === 0;
  }
}


/* =========================================================
 * TEXT BLOCK
 * ========================================================= */

function renderTextBlock(
  label,
  value
) {

  if (!value) {
    return "";
  }


  return `

    <div class="detail-text-block">

      <span class="detail-label">

        ${escapeHtml(label)}

      </span>

      <p>

        ${escapeHtml(value)}

      </p>

    </div>
  `;
}


/* =========================================================
 * EMPTY / LOADING / ERROR
 * ========================================================= */

function renderEmptyLeadDetail() {

  const panel =
    document.getElementById(
      "leadDetail"
    );


  if (!panel) {
    return;
  }


  panel.className =
    "detail-panel empty";


  panel.innerHTML = `

    <div class="detail-empty-state">

      <h2>
        Select a lead
      </h2>

      <p>
        Click a row to load the complete CRM record.
      </p>

    </div>
  `;
}


function renderLeadDetailLoading() {

  const panel =
    document.getElementById(
      "leadDetail"
    );


  if (!panel) {
    return;
  }


  panel.className =
    "detail-panel";


  panel.innerHTML = `

    <div class="detail-empty-state">

      <h2>
        Loading...
      </h2>

      <p>
        Retrieving lead information.
      </p>

    </div>
  `;
}


function renderLeadDetailError(
  message
) {

  const panel =
    document.getElementById(
      "leadDetail"
    );


  if (!panel) {
    return;
  }


  panel.className =
    "detail-panel";


  panel.innerHTML = `

    <div class="detail-empty-state">

      <h2>
        Could not load lead
      </h2>

      <p>

        ${escapeHtml(message)}

      </p>

    </div>
  `;
}


/* =========================================================
 * BADGES
 * ========================================================= */

function renderCrmBadge(
  value,
  type
) {

  if (!value) {

    return `

      <span class="badge badge-neutral">
        —
      </span>
    `;
  }


  const normalized =
    String(value)
      .trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-"
      );


  return `

    <span
      class="badge badge-${escapeHtmlAttribute(
        type
      )} badge-${escapeHtmlAttribute(
        normalized
      )}"
    >

      ${escapeHtml(
        formatCrmLabel(value)
      )}

    </span>
  `;
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
 * GENERIC HELPERS
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


function formatCrmLabel(
  value
) {

  if (!value) {
    return "";
  }


  return String(value)
    .replace(
      /_/g,
      " "
    )
    .replace(
      /\b\w/g,
      char =>
        char.toUpperCase()
    );
}


function formatCrmDate(
  value
) {

  const timestamp =
    parseCrmDateTime(
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
      year: "numeric",
      month: "short",
      day: "2-digit"
    }
  ).format(
    new Date(timestamp)
  );
}


function formatCrmDateTime(
  value
) {

  const timestamp =
    parseCrmDateTime(
      value
    );


  if (
    timestamp === null
  ) {

    return value
      ? String(value)
      : "—";
  }


  return new Intl.DateTimeFormat(
    "en-GB",
    {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }
  ).format(
    new Date(timestamp)
  );
}


function parseCrmDateTime(
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
      "number"
  ) {

    if (
      !Number.isFinite(value)
    ) {

      return null;
    }


    /*
     * Already a JS millisecond timestamp.
     */
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


function formatDateTimeLocalValue(
  value
) {

  const timestamp =
    parseCrmDateTime(
      value
    );


  if (
    timestamp === null
  ) {

    return "";
  }


  const date =
    new Date(timestamp);


  const pad =
    value =>
      String(value)
        .padStart(
          2,
          "0"
        );


  return (

    date.getFullYear() +
    "-" +

    pad(
      date.getMonth() + 1
    ) +
    "-" +

    pad(
      date.getDate()
    ) +
    "T" +

    pad(
      date.getHours()
    ) +
    ":" +

    pad(
      date.getMinutes()
    )
  );
}


function combineLocation(
  location,
  country
) {

  return [
    location,
    country
  ]
    .filter(Boolean)
    .join(", ");
}


function normalizeComparableCrmValue(
  field,
  value
) {

  if (
    value === null ||
    value === undefined
  ) {

    return "";
  }


  if (
    field ===
      "Next_action_at"
  ) {

    return formatDateTimeLocalValue(
      value
    );
  }


  return String(value)
    .trim();
}


function normalizeCrmBoolean(
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

function escapeHtml(
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


function escapeHtmlAttribute(
  value
) {

  return escapeHtml(
    value
  );
}
