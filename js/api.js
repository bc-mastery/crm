/**
 * Business Canvas CRM
 * API communication layer
 */


/* =========================================================
 * GET REQUEST
 * ========================================================= */

/**
 * Send a GET request to the CRM API.
 */
async function crmApiGet(params = {}) {

  const url =
    new URL(
      "/api",
      window.location.origin
    );


  Object.entries(params)
    .forEach(
      ([key, value]) => {

        if (
          value !== undefined &&
          value !== null &&
          value !== ""
        ) {

          url.searchParams.set(
            key,
            value
          );
        }

      }
    );


  const response =
    await fetch(
      url.toString(),
      {
        method: "GET",
        redirect: "follow"
      }
    );


  if (!response.ok) {

    throw new Error(
      `CRM API request failed: ${response.status}`
    );
  }


  const data =
    await response.json();


  if (
    !data ||
    data.success !== true
  ) {

    throw new Error(
      data?.error ||
      "Unknown CRM API error."
    );
  }


  return data;
}


/* =========================================================
 * POST REQUEST
 * ========================================================= */

/**
 * Send a POST request to the CRM API.
 */
async function crmApiPost(
  body = {}
) {

  const url =
    new URL(
      "/api",
      window.location.origin
    );


  const response =
    await fetch(
      url.toString(),
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify(
            body
          ),

        redirect:
          "follow"
      }
    );


  if (!response.ok) {

    throw new Error(
      `CRM API request failed: ${response.status}`
    );
  }


  const data =
    await response.json();


  if (
    !data ||
    data.success !== true
  ) {

    throw new Error(
      data?.error ||
      "Unknown CRM API error."
    );
  }


  return data;
}


/* =========================================================
 * LIST LEADS
 * ========================================================= */

/**
 * Fetch the CRM lead list.
 */
async function getCrmLeads() {

  const data =
    await crmApiGet({
      action:
        "listLeads"
    });


  return data.leads || [];
}


/* =========================================================
 * GET ONE LEAD
 * ========================================================= */

/**
 * Fetch one complete lead record.
 */
async function getCrmLead(
  leadId
) {

  if (!leadId) {

    throw new Error(
      "Lead ID is required."
    );
  }


  const data =
    await crmApiGet({
      action:
        "getLead",

      leadId:
        leadId
    });


  return data.lead || null;
}


/* =========================================================
 * UPDATE LEAD
 * ========================================================= */

/**
 * Update one CRM lead.
 *
 * Multiple fields can be saved
 * in a single request.
 *
 * Example:
 *
 * updateCrmLead(
 *   "LEAD-000001",
 *   {
 *     Pipeline_stage: "CONTACTED",
 *     Next_action_type: "FOLLOW_UP"
 *   }
 * );
 */
async function updateCrmLead(
  leadId,
  updates
) {

  if (!leadId) {

    throw new Error(
      "Lead ID is required."
    );
  }


  if (
    !updates ||
    typeof updates !== "object" ||
    Array.isArray(updates)
  ) {

    throw new Error(
      "Lead updates are required."
    );
  }


  if (
    Object.keys(
      updates
    ).length === 0
  ) {

    throw new Error(
      "No changes to save."
    );
  }


  const data =
    await crmApiPost({

      action:
        "updateLead",

      leadId:
        leadId,

      updates:
        updates
    });


  return data.lead || null;
}
