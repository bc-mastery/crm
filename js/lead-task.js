/**
 * Business Canvas CRM — Lead Profile task creation
 */

const LEAD_PROFILE_TASK_TYPES = [
  "CHECK_CONNECTION",
  "SEND_MESSAGE",
  "FOLLOW_UP",
  "CONTINUE_CONVERSATION",
  "FOLLOW_UP_REVIEW_CALL",
  "SEND_GS",
  "CHECK_GS",
  "PREPARE_REVIEW_CALL",
  "SEND_POST_CALL",
  "FOLLOW_UP_PROPOSAL",
  "ONBOARDING",
  "OTHER"
];

document.addEventListener("DOMContentLoaded", initializeLeadProfileTaskAction);

function initializeLeadProfileTaskAction() {
  bindLeadProfileTaskDialog_();

  const button = document.getElementById("leadProfileNewTaskButton");
  button?.addEventListener("click", openLeadProfileTaskDialog_);

  const detailPanel = document.getElementById("leadProfileDetail");
  if (detailPanel) {
    const observer = new MutationObserver(syncLeadProfileTaskButton_);
    observer.observe(detailPanel, {
      childList: true,
      subtree: true
    });
  }

  syncLeadProfileTaskButton_();
}

function syncLeadProfileTaskButton_() {
  const button = document.getElementById("leadProfileNewTaskButton");
  if (!button) return;

  button.disabled = !LEAD_PROFILE_STATE?.selectedLead?.Lead_id;
}

function bindLeadProfileTaskDialog_() {
  document.getElementById("leadTaskDialogClose")
    ?.addEventListener("click", closeLeadProfileTaskDialog_);

  document.getElementById("leadTaskDialogCancel")
    ?.addEventListener("click", closeLeadProfileTaskDialog_);

  document.getElementById("leadTaskForm")
    ?.addEventListener("submit", submitLeadProfileTask_);
}

async function openLeadProfileTaskDialog_() {
  const lead = LEAD_PROFILE_STATE?.selectedLead || null;
  const dialog = document.getElementById("leadTaskDialog");

  if (!lead || !dialog) {
    return;
  }

  const companyLabel = document.getElementById("leadTaskCompanyLabel");
  if (companyLabel) {
    companyLabel.textContent = lead.Company_name || lead.Lead_id || "Selected lead";
  }

  const typeSelect = document.getElementById("leadTaskTypeInput");
  if (typeSelect) {
    typeSelect.innerHTML = "";

    LEAD_PROFILE_TASK_TYPES.forEach(value => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = prettifyLeadProfileTask_(value);
      typeSelect.appendChild(option);
    });

    typeSelect.value = "OTHER";
  }

  const meta =
    typeof ensureLeadProfileMetaLoaded === "function"
      ? await ensureLeadProfileMetaLoaded()
      : LEAD_PROFILE_STATE?.meta;

  const userSelect = document.getElementById("leadTaskUserInput");
  if (userSelect) {
    userSelect.innerHTML = '<option value="">Select user</option>';

    const users = meta?.responsibleUsers || [];

    users.forEach(user => {
      const option = document.createElement("option");
      option.value = user.email;
      option.textContent = user.name || user.email;
      userSelect.appendChild(option);
    });

    const preferredUser =
      lead.Responsible_email ||
      meta?.user?.email ||
      "";

    if ([...userSelect.options].some(option => option.value === preferredUser)) {
      userSelect.value = preferredUser;
    }
  }

  const titleInput = document.getElementById("leadTaskTitleInput");
  const dueInput = document.getElementById("leadTaskDueInput");
  const notesInput = document.getElementById("leadTaskNotesInput");

  if (titleInput) titleInput.value = "";
  if (dueInput) dueInput.value = "";
  if (notesInput) notesInput.value = "";

  dialog.showModal();

  requestAnimationFrame(() => {
    titleInput?.focus();
  });
}

function closeLeadProfileTaskDialog_() {
  document.getElementById("leadTaskDialog")?.close();
}

async function submitLeadProfileTask_(event) {
  event.preventDefault();

  const lead = LEAD_PROFILE_STATE?.selectedLead;
  if (!lead?.Lead_id) return;

  const taskType = document.getElementById("leadTaskTypeInput")?.value || "OTHER";
  const taskTitle = String(document.getElementById("leadTaskTitleInput")?.value || "").trim();
  const dueAt = document.getElementById("leadTaskDueInput")?.value || "";
  const responsibleEmail = document.getElementById("leadTaskUserInput")?.value || "";
  const notes = String(document.getElementById("leadTaskNotesInput")?.value || "").trim();

  if (!taskTitle || !responsibleEmail) {
    return;
  }

  const submitButton = document.getElementById("leadTaskSubmitButton");
  if (submitButton) submitButton.disabled = true;

  try {
    if (typeof showLeadProfileStatus === "function") {
      showLeadProfileStatus("Creating task...", "info");
    }

    const created = await createCrmTask({
      leadId: lead.Lead_id,
      taskType,
      taskTitle,
      dueAt,
      responsibleEmail,
      notes
    });

    if (typeof acceptCrmTaskIntoCache === "function" && created) {
      acceptCrmTaskIntoCache(created);
    }

    closeLeadProfileTaskDialog_();

    if (typeof showLeadProfileStatus === "function") {
      showLeadProfileStatus("Task created.", "success");
      window.setTimeout(() => {
        if (typeof hideLeadProfileStatus === "function") {
          hideLeadProfileStatus();
        }
      }, 1800);
    }

  } catch (error) {
    console.error(error);

    if (typeof showLeadProfileStatus === "function") {
      showLeadProfileStatus(error?.message || "Could not create task.", "error");
    }

  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

function prettifyLeadProfileTask_(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, character => character.toUpperCase());
}
