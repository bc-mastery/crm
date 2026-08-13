/**
 * Business Canvas CRM
 * Shared Lead Detail renderer / editor
 *
 * Used by:
 * - Leads page
 * - Lead Profile page
 */


/* =========================================================
 * CONTEXT
 * ========================================================= */

let LEAD_DETAIL_CONTEXT = null;


/**
 * Configure the shared Lead Detail engine.
 *
 * Expected context:
 *
 * {
 *   panelId: "leadDetail",
 *   getState: () => CRM_STATE,
 *   onLeadUpdated: updatedLead => {},
 *   showStatus: (message, type) => {},
 *   openProfile: lead => {}
 * }
 */
function configureLeadDetail(
  context
) {

  LEAD_DETAIL_CONTEXT =
    context || null;
}


function getLeadDetailContext() {

  return (
    LEAD_DETAIL_CONTEXT ||
    {}
  );
}


function getLeadDetailState() {

  const context =
    getLeadDetailContext();


  if (
    typeof context.getState !==
      "function"
  ) {

    throw new Error(
      "Lead Detail context is not configured."
    );
  }


  return context.getState();
}


function getLeadDetailPanel() {

  const context =
    getLeadDetailContext();


  const panelId =
    context.panelId ||
    "leadDetail";


  return document.getElementById(
    panelId
  );
}


function showLeadDetailStatus(
  message,
  type = "info"
) {

  const context =
    getLeadDetailContext();


  if (
    typeof context.showStatus ===
      "function"
  ) {

    context.showStatus(
      message,
      type
    );
  }
}


function notifyLeadUpdated(
  updatedLead
) {

  const context =
    getLeadDetailContext();


  if (
    typeof context.onLeadUpdated ===
      "function"
  ) {

    context.onLeadUpdated(
      updatedLead
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
    getLeadDetailPanel();


  if (!panel) {
    return;
  }


  const state =
    getLeadDetailState();


  /*
   * Preserve internal scroll position whenever
   * the same Lead record is re-rendered.
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


  const isManager =
    state.meta
      ?.user
      ?.role ===
        "manager";


  const context =
    getLeadDetailContext();


  const headerClickable =
    typeof context.openProfile ===
      "function";


  panel.innerHTML = `

    <div class="detail-fixed-top">

      <div
        class="detail-header ${
          headerClickable
            ? "detail-header-clickable"
            : ""
        }"
        ${
          headerClickable
            ? "data-open-lead-profile"
            : ""
        }
      >

        <div>

          <span class="detail-eyebrow">

            ${escapeHtml(
              lead.Lead_id || ""
            )}

          </span>

          <h2>

  ${
    headerClickable

      ? `
        <a
          href="lead.html?lead=${encodeURIComponent(
            lead.Lead_id || ""
          )}"
          class="lead-profile-link"
          title="Open Lead Profile"
        >
          ${escapeHtml(
            lead.Company_name ||
            "Unnamed company"
          )}
          <span class="lead-profile-link-arrow">↗</span>
        </a>
      `

      : escapeHtml(
          lead.Company_name ||
          "Unnamed company"
        )
  }

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

  const state =
    getLeadDetailState();


  const editing =
    state.editingField ===
      field;


  const hasPending =
    Object.prototype
      .hasOwnProperty
      .call(
        state.pendingUpdates,
        field
      );


  const currentValue =
    hasPending

      ? state
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

  const state =
    getLeadDetailState();


  const users =
    state.meta
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
    state.editingField ===
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

  const state =
    getLeadDetailState();


  const values =
    state.meta
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

  const state =
    getLeadDetailState();


  const count =
    Object.keys(
      state.pendingUpdates
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
    getLeadDetailPanel();


  if (!panel) {
    return;
  }


  const state =
    getLeadDetailState();


  panel
    .querySelectorAll(
      "[data-edit-field]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          event => {

            event.stopPropagation();


            state.editingField =
              button.dataset.editField;


            renderLeadDetail(
              state.selectedLead
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
          event => {

            event.stopPropagation();


            state.editingField =
              null;


            renderLeadDetail(
              state.selectedLead
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


        input.addEventListener(
          "click",
          event =>
            event.stopPropagation()
        );
      }
    );


  panel
    .querySelector(
      "[data-save-lead]"
    )
    ?.addEventListener(
      "click",
      event => {

        event.stopPropagation();

        saveSelectedLeadChanges();
      }
    );


  panel
    .querySelectorAll(
      "[data-milestone]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "dblclick",
          async event => {

            event.stopPropagation();


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
          async event => {

            event.stopPropagation();


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
      event => {

        event.stopPropagation();

        toggleArchive();
      }
    );


  const profileHeader =
    panel.querySelector(
      "[data-open-lead-profile]"
    );


  if (profileHeader) {

    profileHeader.addEventListener(
      "click",
      event => {

        /*
         * Never navigate when the click originated
         * from an interactive control.
         */
        if (
          event.target.closest(
            "button, input, select, textarea, a"
          )
        ) {

          return;
        }


        const context =
          getLeadDetailContext();


        if (
          typeof context.openProfile ===
            "function"
        ) {

          context.openProfile(
            state.selectedLead
          );
        }
      }
    );
  }
}


/* =========================================================
 * EDIT CHANGE
 * ========================================================= */

function handleEditInputChange(
  event
) {

  const state =
    getLeadDetailState();


  const field =
    event.target.dataset.field;


  if (!field) {
    return;
  }


  const newValue =
    event.target.value;


  const original =
    state.selectedLead[
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

    delete state
      .pendingUpdates[
        field
      ];

  } else {

    state
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

  const state =
    getLeadDetailState();


  const updates = {

    ...state.pendingUpdates
  };


  if (
    !state.selectedLeadId ||
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
        state.selectedLeadId,
        updates
      );


    state.selectedLead =
      updatedLead;


    notifyLeadUpdated(
      updatedLead
    );


    state.pendingUpdates =
      {};


    state.editingField =
      null;


    renderLeadDetail(
      updatedLead
    );


  } catch (error) {

    console.error(error);


    showLeadDetailStatus(
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

  const state =
    getLeadDetailState();


  if (
    state.workflowBusy ||
    !state.selectedLeadId
  ) {

    return;
  }


  setWorkflowBusy(
    true
  );


  try {

    const updatedLead =
      await toggleCrmMilestone(
        state.selectedLeadId,
        milestone
      );


    state.selectedLead =
      updatedLead;


    notifyLeadUpdated(
      updatedLead
    );


    renderLeadDetail(
      updatedLead
    );


  } catch (error) {

    console.error(error);


    showLeadDetailStatus(
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

  const state =
    getLeadDetailState();


  if (
    state.workflowBusy ||
    !state.selectedLeadId
  ) {

    return;
  }


  setWorkflowBusy(
    true
  );


  try {

    const updatedLead =
      await setCrmOutcome(
        state.selectedLeadId,
        outcome
      );


    state.selectedLead =
      updatedLead;


    notifyLeadUpdated(
      updatedLead
    );


    renderLeadDetail(
      updatedLead
    );


  } catch (error) {

    console.error(error);


    showLeadDetailStatus(
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

  const state =
    getLeadDetailState();


  if (
    state.workflowBusy ||
    !state.selectedLead
  ) {

    return;
  }


  setWorkflowBusy(
    true
  );


  try {

    const updatedLead =
      await updateCrmLead(
        state.selectedLeadId,
        {
          Is_archived:
            !normalizeCrmBoolean(
              state
                .selectedLead
                .Is_archived
            )
        }
      );


    state.selectedLead =
      updatedLead;


    notifyLeadUpdated(
      updatedLead
    );


    renderLeadDetail(
      updatedLead
    );


  } catch (error) {

    console.error(error);


    showLeadDetailStatus(
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
 * BUSY
 * ========================================================= */

function setWorkflowBusy(
  busy
) {

  const state =
    getLeadDetailState();


  state.workflowBusy =
    busy;


  getLeadDetailPanel()
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

  const panel =
    getLeadDetailPanel();


  if (!panel) {
    return;
  }


  const state =
    getLeadDetailState();


  const bar =
    panel.querySelector(
      ".lead-save-bar"
    );


  if (!bar) {
    return;
  }


  const count =
    Object.keys(
      state.pendingUpdates
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
    getLeadDetailPanel();


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
    getLeadDetailPanel();


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
    getLeadDetailPanel();


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
 * GENERIC HELPERS
 * ========================================================= */

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

