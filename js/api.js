/**
 * Business Canvas CRM
 * API communication layer
 */


/**
 * Send a GET request to the CRM Apps Script API.
 */
async function crmApiGet(params = {}) {

  const url =
    new URL(
      CRM_CONFIG.API_URL
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


/**
 * Fetch the CRM lead list.
 */
async function getCrmLeads() {

  const data =
    await crmApiGet({
      action: "listLeads"
    });

  return data.leads || [];
}


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
      action: "getLead",
      leadId: leadId
    });

  return data.lead || null;
}
