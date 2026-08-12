/**
 * Business Canvas CRM
 * Main frontend application logic
 */


/* =========================================================
 * CRM STATE
 * ========================================================= */

let CRM_STATE = {

  leads: [],

  filteredLeads: [],

  selectedLeadId:
    null,

  selectedLead:
    null,

  pendingUpdates:
    {}
};


/* =========================================================
 * PROTECTED FIELDS
 *
 * These fields are visible where relevant,
 * but cannot be edited from the CRM.
 * ========================================================= */

const CRM_PROTECTED_FIELDS = [

  "Lead_id",

  "Company_name",
  "Clutch_url",
  "Clutch_intro",
  "Manpower",
  "Project_size",
  "Location",
  "Country",
  "Quick_evaluation",

  "Company_lead",
  "Founder_lead",
  "FL_date",

  "Research_status",
  "Data_confidence",
  "ICP_fit_level",

  "T_issue",
  "O_issue",
  "M_issue",
  "S_issue",

  "Outreach_angle",
  "Research_notes",

  "Raw_json"
];


/* =========================================================
 * INITIALIZATION
 * ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    initializeCrmApp();
  }
);


async function initializeCrmApp() {

  bindCrmUiEvents();

  await loadCrmLeads();
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


    CRM_STATE.filteredLeads =
      leads;


    populatePipelineStageFilter(
      leads
    );


    renderLeadTable(
      leads
    );


    updateLeadCount(
      leads.length
    );


    hideCrmStatus();


  } catch (error) {

    console.error(
      error
    );


    showCrmStatus(
      "Could not load CRM leads: " +
      error.message,
      "error"
    );
  }
}


/* =========================================================
 * UI EVENTS
 * ========================================================= */

function bindCrmUiEvents() {

  const searchInput =
    document.getElementById(
      "searchInput"
    );


  const stageFilter =
    document.getElementById(
      "stageFilter"
    );


  const icpFilter =
    document.getElementById(
      "icpFilter"
    );


  const refreshButton =
    document.getElementById(
      "refreshButton"
    );


  if (searchInput) {

    searchInput.addEventListener(
      "input",
      applyLeadFilters
    );
  }


  if (stageFilter) {

    stageFilter.addEventListener(
      "change",
      applyLeadFilters
    );
  }


  if (icpFilter) {

    icpFilter.addEventListener(
      "change",
      applyLeadFilters
    );
  }


  if (refreshButton) {

    refreshButton.addEventListener(
      "click",
      async () => {

        CRM_STATE.selectedLeadId =
          null;


        CRM_STATE.selectedLead =
          null;


        CRM_STATE.pendingUpdates =
          {};


        renderEmptyLeadDetail();


        await loadCrmLeads();
      }
    );
  }
}


/* =========================================================
 * FILTERING
 * ========================================================= */

function applyLeadFilters() {

  const searchValue =
    String(
      document
        .getElementById(
          "searchInput"
        )
        ?.value || ""
    )
      .trim()
      .toLowerCase();


  const stageValue =
    String(
      document
        .getElementById(
          "stageFilter"
        )
        ?.value || ""
    )
      .trim()
      .toUpperCase();


  const icpValue =
    String(
      document
        .getElementById(
          "icpFilter"
        )
        ?.value || ""
    )
      .trim()
      .toUpperCase();


  const filtered =
    CRM_STATE.leads.filter(
      lead => {

        const searchable =
          [

            lead.Company_name,
            lead.Founder_1_name,
            lead.Lead_id,
            lead.Website,
            lead.Responsible_email

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
          )
            .toUpperCase() ===
          stageValue;


        const matchesIcp =
          !icpValue ||
          String(
            lead.ICP_fit_level || ""
          )
            .toUpperCase() ===
          icpValue;


        return (

          matchesSearch &&
          matchesStage &&
          matchesIcp
        );
      }
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
 * PIPELINE FILTER OPTIONS
 * ========================================================= */

function populatePipelineStageFilter(
  leads
) {

  const select =
    document.getElementById(
      "stageFilter"
    );


  if (!select) {
    return;
  }


  const currentValue =
    select.value;


  const stages =
    [
      ...new Set(
        leads
          .map(
            lead =>
              String(
                lead.Pipeline_stage ||
                ""
              ).trim()
          )
          .filter(Boolean)
      )
    ].sort();


  select.innerHTML =
    '<option value="">All pipeline stages</option>';


  stages.forEach(
    stage => {

      const option =
        document.createElement(
          "option"
        );


      option.value =
        stage;


      option.textContent =
        formatCrmLabel(
          stage
        );


      select.appendChild(
        option
      );
    }
  );


  if (
    stages.includes(
      currentValue
    )
  ) {

    select.value =
      currentValue;
  }
}


/* =========================================================
 * LEAD TABLE
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
    !Array.isArray(
      leads
    ) ||
    leads.length === 0
  ) {

    const row =
      document.createElement(
        "tr"
      );


    row.innerHTML = `

      <td
        colspan="6"
        class="empty-table-cell"
      >
        No leads match the current filters.
      </td>
    `;


    tbody.appendChild(
      row
    );


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


      row.innerHTML = `

        <td>

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


        <td>

          ${escapeHtml(
            lead.Founder_1_name ||
            "—"
          )}

        </td>


        <td>

          ${renderCrmBadge(
            lead.ICP_fit_level,
            "icp"
          )}

        </td>


        <td>

          ${renderCrmBadge(
            lead.Pipeline_stage,
            "stage"
          )}

        </td>


        <td>

          ${renderNextAction(
            lead
          )}

        </td>


        <td>

          ${escapeHtml(
            lead.Responsible_email ||
            "—"
          )}

        </td>
      `;


      row.addEventListener(
        "click",
        () => {

          selectCrmLead(
            lead.Lead_id
          );
        }
      );


      tbody.appendChild(
        row
      );
    }
  );
}


/* =========================================================
 * SELECT / LOAD LEAD
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

    console.error(
      error
    );


    renderLeadDetailError(
      error.message
    );
  }
}


/* =========================================================
 * LEAD DETAIL
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


  panel.classList.remove(
    "empty"
  );


  panel.innerHTML = `

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


    <div
      id="leadSaveBar"
      class="lead-save-bar"
    >

      <span
        id="leadSaveStatus"
        class="lead-save-status"
      >
        No unsaved changes
      </span>


      <button
        type="button"
        id="saveLeadButton"
        class="save-lead-button"
        disabled
      >
        Save changes
      </button>

    </div>


    <div class="detail-section">

      <h3>
        Company
      </h3>


      ${renderEditableDetailField(
        "Website",
        "Website",
        lead.Website,
        "url"
      )}


      ${renderReadOnlyLinkField(
        "Clutch",
        lead.Clutch_url
      )}


      ${renderDetailField(
        "Location",
        combineLocation(
          lead.Location,
          lead.Country
        )
      )}


      ${renderDetailField(
        "Manpower",
        lead.Manpower
      )}


      ${renderDetailField(
        "Project size",
        lead.Project_size
      )}

    </div>


    <div class="detail-section">

      <h3>
        Founder
      </h3>


      ${renderEditableDetailField(
        "Name",
        "Founder_1_name",
        lead.Founder_1_name
      )}


      ${renderEditableDetailField(
        "LinkedIn",
        "Founder_1_LinkedIn",
        lead.Founder_1_LinkedIn,
        "url"
      )}


      ${renderEditableDetailField(
        "Email",
        "Founder_1_email",
        lead.Founder_1_email,
        "email"
      )}

    </div>


    <div class="detail-section">

      <h3>
        Qualification
      </h3>


      ${renderDetailField(
        "ICP fit",
        lead.ICP_fit_level
      )}


      ${renderDetailField(
        "Research status",
        lead.Research_status
      )}


      ${renderEditableDetailField(
        "Responsible",
        "Responsible_email",
        lead.Responsible_email,
        "email"
      )}

    </div>


    <div class="detail-section">

      <h3>
        Pipeline
      </h3>


      ${renderEditableDetailField(
        "Pipeline stage",
        "Pipeline_stage",
        lead.Pipeline_stage
      )}


      ${renderEditableDetailField(
        "Conclusion",
        "Conclusion",
        lead.Conclusion,
        "textarea"
      )}

    </div>


    <div class="detail-section">

      <h3>
        Next action
      </h3>


      ${renderEditableDetailField(
        "Type",
        "Next_action_type",
        lead.Next_action_type
      )}


      ${renderEditableDetailField(
        "Due",
        "Next_action_at",
        lead.Next_action_at,
        "datetime-local"
      )}

    </div>


    <div class="detail-section">

      <h3>
        Contact progress
      </h3>


      ${renderEditableCheckboxField(
        "Connection request",
        "CR",
        lead.CR
      )}


      ${renderEditableCheckboxField(
        "Connection accepted",
        "CA",
        lead.CA
      )}


      ${renderEditableCheckboxField(
        "Message sent",
        "MS",
        lead.MS
      )}


      ${renderEditableCheckboxField(
        "Response received",
        "RT",
        lead.RT
      )}

    </div>


    <div class="detail-section">

      <h3>
        Deal progress
      </h3>


      ${renderEditableCheckboxField(
        "Review Call Offered",
        "Review Call Offered",
        lead["Review Call Offered"]
      )}


      ${renderEditableCheckboxField(
        "Review Call Booked",
        "Review Call Booked",
        lead["Review Call Booked"]
      )}


      ${renderEditableCheckboxField(
        "GS Sent",
        "GS Sent",
        lead["GS Sent"]
      )}


      ${renderEditableCheckboxField(
        "GS Completed",
        "GS Completed",
        lead["GS Completed"]
      )}


      ${renderEditableCheckboxField(
        "Review Call Done",
        "Review Call Done",
        lead["Review Call Done"]
      )}


      ${renderEditableCheckboxField(
        "Proposal Sent",
        "Proposal Sent",
        lead["Proposal Sent"]
      )}

    </div>


    <div class="detail-section">

      <h3>
        Response
      </h3>


      ${renderEditableDetailField(
        "Response content",
        "Response content",
        lead["Response content"],
        "textarea"
      )}

    </div>


    <div class="detail-section">

      <h3>
        Research notes
      </h3>


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

      <h3>
        Record
      </h3>


      ${renderEditableCheckboxField(
        "Archived",
        "Is_archived",
        lead.Is_archived
      )}

    </div>
  `;


  bindLeadDetailEditEvents();
}


/* =========================================================
 * LEAD DETAIL EDIT EVENTS
 * ========================================================= */

function bindLeadDetailEditEvents() {

  const panel =
    document.getElementById(
      "leadDetail"
    );


  if (!panel) {
    return;
  }


  const editableFields =
    panel.querySelectorAll(
      "[data-crm-field]"
    );


  editableFields.forEach(
    element => {

      const eventName =
        element.type ===
          "checkbox"

          ? "change"

          : "input";


      element.addEventListener(
        eventName,
        handleLeadFieldChange
      );
    }
  );


  const saveButton =
    document.getElementById(
      "saveLeadButton"
    );


  if (saveButton) {

    saveButton.addEventListener(
      "click",
      saveSelectedLeadChanges
    );
  }
}


/* =========================================================
 * TRACK FIELD CHANGES
 * ========================================================= */

function handleLeadFieldChange(
  event
) {

  const element =
    event.target;


  const field =
    element.dataset.crmField;


  if (!field) {
    return;
  }


  let value;


  if (
    element.type ===
      "checkbox"
  ) {

    value =
      element.checked;

  } else {

    value =
      element.value;
  }


  const originalValue =
    CRM_STATE.selectedLead
      ? CRM_STATE.selectedLead[
          field
        ]
      : "";


  const comparableOriginal =
    normalizeComparableCrmValue(
      field,
      originalValue
    );


  const comparableNew =
    normalizeComparableCrmValue(
      field,
      value
    );


  if (
    comparableOriginal ===
      comparableNew
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
        value;
  }


  updateLeadSaveState();
}


/* =========================================================
 * SAVE LEAD
 * ========================================================= */

async function saveSelectedLeadChanges() {

  if (
    !CRM_STATE.selectedLeadId
  ) {

    return;
  }


  const updates =
    {
      ...CRM_STATE
        .pendingUpdates
    };


  if (
    Object.keys(
      updates
    ).length === 0
  ) {

    return;
  }


  const saveButton =
    document.getElementById(
      "saveLeadButton"
    );


  const saveStatus =
    document.getElementById(
      "leadSaveStatus"
    );


  if (saveButton) {

    saveButton.disabled =
      true;


    saveButton.textContent =
      "Saving...";
  }


  if (saveStatus) {

    saveStatus.textContent =
      "Saving changes...";
  }


  try {

    const updatedLead =
      await updateCrmLead(
        CRM_STATE.selectedLeadId,
        updates
      );


    CRM_STATE.selectedLead =
      updatedLead;


    CRM_STATE.pendingUpdates =
      {};


    /*
     * Update the lightweight lead list
     * without requiring a complete refresh.
     */
    updateLeadInState(
      updatedLead
    );


    applyLeadFilters();


    renderLeadDetail(
      updatedLead
    );


    const refreshedStatus =
      document.getElementById(
        "leadSaveStatus"
      );


    if (refreshedStatus) {

      refreshedStatus.textContent =
        "Changes saved";
    }


  } catch (error) {

    console.error(
      error
    );


    if (saveButton) {

      saveButton.disabled =
        false;


      saveButton.textContent =
        "Save changes";
    }


    if (saveStatus) {

      saveStatus.textContent =
        "Could not save: " +
        error.message;
    }
  }
}


/* =========================================================
 * UPDATE LEAD IN LOCAL STATE
 * ========================================================= */

function updateLeadInState(
  updatedLead
) {

  if (
    !updatedLead ||
    !updatedLead.Lead_id
  ) {

    return;
  }


  const index =
    CRM_STATE.leads
      .findIndex(
        lead =>
          lead.Lead_id ===
          updatedLead.Lead_id
      );


  if (
    index === -1
  ) {

    return;
  }


  /*
   * Merge complete lead data into
   * the lightweight list entry.
   */
  CRM_STATE.leads[
    index
  ] = {

    ...CRM_STATE.leads[
      index
    ],

    ...updatedLead
  };
}


/* =========================================================
 * SAVE STATE
 * ========================================================= */

function updateLeadSaveState() {

  const saveButton =
    document.getElementById(
      "saveLeadButton"
    );


  const saveStatus =
    document.getElementById(
      "leadSaveStatus"
    );


  const count =
    Object.keys(
      CRM_STATE.pendingUpdates
    ).length;


  if (saveButton) {

    saveButton.disabled =
      count === 0;
  }


  if (saveStatus) {

    saveStatus.textContent =

      count === 0

        ? "No unsaved changes"

        : `${count} unsaved change${
            count === 1
              ? ""
              : "s"
          }`;
  }
}


/* =========================================================
 * EDITABLE FIELD RENDERING
 * ========================================================= */

function renderEditableDetailField(
  label,
  field,
  value,
  type = "text"
) {

  if (
    CRM_PROTECTED_FIELDS.includes(
      field
    )
  ) {

    return renderDetailField(
      label,
      value
    );
  }


  const cleanValue =
    value === null ||
    value === undefined

      ? ""

      : String(
          value
        );


  if (
    type ===
      "textarea"
  ) {

    return `

      <div class="detail-field editable-detail-field">

        <label
          class="detail-label"
          for="crm-field-${escapeHtmlAttribute(
            field
          )}"
        >
          ${escapeHtml(
            label
          )}
        </label>


        <textarea
          id="crm-field-${escapeHtmlAttribute(
            field
          )}"
          class="crm-detail-input crm-detail-textarea"
          data-crm-field="${escapeHtmlAttribute(
            field
          )}"
        >${escapeHtml(
          cleanValue
        )}</textarea>

      </div>
    `;
  }


  let inputValue =
    cleanValue;


  if (
    type ===
      "datetime-local"
  ) {

    inputValue =
      formatDateTimeLocalValue(
        cleanValue
      );
  }


  return `

    <div class="detail-field editable-detail-field">

      <label
        class="detail-label"
        for="crm-field-${escapeHtmlAttribute(
          field
        )}"
      >
        ${escapeHtml(
          label
        )}
      </label>


      <input
        id="crm-field-${escapeHtmlAttribute(
          field
        )}"
        class="crm-detail-input"
        type="${escapeHtmlAttribute(
          type
        )}"
        value="${escapeHtmlAttribute(
          inputValue
        )}"
        data-crm-field="${escapeHtmlAttribute(
          field
        )}"
      />

    </div>
  `;
}


/* =========================================================
 * EDITABLE CHECKBOX
 * ========================================================= */

function renderEditableCheckboxField(
  label,
  field,
  value
) {

  if (
    CRM_PROTECTED_FIELDS.includes(
      field
    )
  ) {

    return renderDetailField(
      label,
      value
        ? "Yes"
        : "No"
    );
  }


  const checked =
    normalizeCrmBoolean(
      value
    );


  return `

    <div class="detail-field editable-detail-field">

      <span class="detail-label">

        ${escapeHtml(
          label
        )}

      </span>


      <label class="crm-checkbox-control">

        <input
          type="checkbox"
          data-crm-field="${escapeHtmlAttribute(
            field
          )}"
          ${checked
            ? "checked"
            : ""}
        />

        <span>
          ${checked
            ? "Completed"
            : "Not completed"}
        </span>

      </label>

    </div>
  `;
}


/* =========================================================
 * READ-ONLY FIELD
 * ========================================================= */

function renderDetailField(
  label,
  value,
  asLink = false
) {

  const cleanValue =
    value === null ||
    value === undefined ||
    value === ""

      ? "—"

      : String(
          value
        );


  let renderedValue =
    escapeHtml(
      cleanValue
    );


  if (
    asLink &&
    cleanValue !== "—"
  ) {

    renderedValue = `

      <a
        href="${escapeHtmlAttribute(
          cleanValue
        )}"
        target="_blank"
        rel="noopener noreferrer"
      >

        ${escapeHtml(
          cleanValue
        )}

      </a>
    `;
  }


  return `

    <div class="detail-field">

      <span class="detail-label">

        ${escapeHtml(
          label
        )}

      </span>


      <div class="detail-value">

        ${renderedValue}

      </div>

    </div>
  `;
}


/* =========================================================
 * READ-ONLY LINK
 * ========================================================= */

function renderReadOnlyLinkField(
  label,
  value
) {

  return renderDetailField(
    label,
    value,
    true
  );
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

        ${escapeHtml(
          label
        )}

      </span>


      <p>

        ${escapeHtml(
          value
        )}

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
        ${escapeHtml(
          message
        )}
      </p>

    </div>
  `;
}


/* =========================================================
 * NEXT ACTION TABLE CELL
 * ========================================================= */

function renderNextAction(
  lead
) {

  if (
    !lead.Next_action_type
  ) {

    return `

      <span class="muted-text">
        —
      </span>
    `;
  }


  return `

    <div class="next-action-cell">

      <strong>

        ${escapeHtml(
          formatCrmLabel(
            lead.Next_action_type
          )
        )}

      </strong>


      <span>

        ${escapeHtml(
          formatCrmDateTime(
            lead.Next_action_at
          )
        )}

      </span>

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
    String(
      value
    )
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
        formatCrmLabel(
          value
        )
      )}

    </span>
  `;
}


/* =========================================================
 * STATUS / COUNT
 * ========================================================= */

function updateLeadCount(
  count
) {

  const element =
    document.getElementById(
      "leadCount"
    );


  if (!element) {
    return;
  }


  element.textContent =
    `${count} lead${
      count === 1
        ? ""
        : "s"
    }`;
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
 * FORMAT HELPERS
 * ========================================================= */

function formatCrmLabel(
  value
) {

  if (!value) {
    return "";
  }


  return String(
    value
  )
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


function formatCrmDateTime(
  value
) {

  if (!value) {
    return "—";
  }


  const date =
    new Date(
      value
    );


  if (
    isNaN(
      date.getTime()
    )
  ) {

    return String(
      value
    );
  }


  return new Intl.DateTimeFormat(
    "en-GB",
    {

      year:
        "numeric",

      month:
        "short",

      day:
        "2-digit",

      hour:
        "2-digit",

      minute:
        "2-digit"
    }
  ).format(
    date
  );
}


function formatDateTimeLocalValue(
  value
) {

  if (!value) {
    return "";
  }


  const date =
    new Date(
      value
    );


  if (
    isNaN(
      date.getTime()
    )
  ) {

    return "";
  }


  const pad =
    number =>
      String(
        number
      ).padStart(
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


/* =========================================================
 * COMPARISON HELPERS
 * ========================================================= */

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
    typeof value ===
      "boolean"
  ) {

    return value
      ? "true"
      : "false";
  }


  if (
    field ===
      "Next_action_at"
  ) {

    return formatDateTimeLocalValue(
      value
    );
  }


  return String(
    value
  ).trim();
}


function normalizeCrmBoolean(
  value
) {

  if (
    value === true
  ) {

    return true;
  }


  const text =
    String(
      value || ""
    )
      .trim()
      .toUpperCase();


  return (

    text === "TRUE" ||
    text === "YES" ||
    text === "1"
  );
}


/* =========================================================
 * SECURITY / ESCAPING
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
