/**
 * Business Canvas CRM
 * Main frontend application logic
 */

let CRM_STATE = {
  leads: [],
  filteredLeads: [],
  selectedLeadId: null,
  selectedLead: null
};


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
      <td colspan="6" class="empty-table-cell">
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


    <div class="detail-section">

      <h3>Company</h3>

      ${renderDetailField(
        "Website",
        lead.Website,
        true
      )}

      ${renderDetailField(
        "Clutch",
        lead.Clutch_url,
        true
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

      <h3>Founder</h3>

      ${renderDetailField(
        "Name",
        lead.Founder_1_name
      )}

      ${renderDetailField(
        "LinkedIn",
        lead.Founder_1_LinkedIn,
        true
      )}

      ${renderDetailField(
        "Email",
        lead.Founder_1_email
      )}

    </div>


    <div class="detail-section">

      <h3>Qualification</h3>

      ${renderDetailField(
        "ICP fit",
        lead.ICP_fit_level
      )}

      ${renderDetailField(
        "Data confidence",
        lead.Data_confidence
      )}

      ${renderDetailField(
        "Research status",
        lead.Research_status
      )}

      ${renderDetailField(
        "Responsible",
        lead.Responsible_email
      )}

    </div>


    <div class="detail-section">

      <h3>Next action</h3>

      ${renderDetailField(
        "Type",
        lead.Next_action_type
      )}

      ${renderDetailField(
        "Due",
        formatCrmDateTime(
          lead.Next_action_at
        )
      )}

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
  `;
}


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
 * RENDER HELPERS
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


function renderTextBlock(
  label,
  value
) {

  if (
    !value
  ) {
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
    `${count} lead${count === 1 ? "" : "s"}`;
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
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }
  ).format(
    date
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
