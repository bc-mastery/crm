/**
 * Business Canvas CRM
 * API communication layer
 */


/* =========================================================
 * GET
 * ========================================================= */

async function crmApiGet(
  params = {}
) {

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


  return parseCrmApiResponse(
    response
  );
}


/* =========================================================
 * POST
 * ========================================================= */

async function crmApiPost(
  body = {}
) {

  const response =
    await fetch(
      "/api",
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


  return parseCrmApiResponse(
    response
  );
}


/* =========================================================
 * RESPONSE
 * ========================================================= */

async function parseCrmApiResponse(
  response
) {

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
 * META
 * ========================================================= */

async function getCrmMeta() {

  return crmApiGet({
    action: "getMeta"
  });
}


/* =========================================================
 * LEADS
 * ========================================================= */

async function getCrmLeads() {

  const data =
    await crmApiGet({
      action: "listLeads"
    });


  return data.leads || [];
}


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
 * ACTIVITIES
 * ========================================================= */

async function getCrmActivities() {

  const data =
    await crmApiGet({
      action: "listActivities"
    });


  return data.activities || [];
}


/* =========================================================
 * UPDATE LEAD
 * ========================================================= */

async function updateCrmLead(
  leadId,
  updates
) {

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


/* =========================================================
 * MILESTONE
 * ========================================================= */

async function toggleCrmMilestone(
  leadId,
  milestone
) {

  const data =
    await crmApiPost({

      action:
        "setMilestone",

      leadId:
        leadId,

      milestone:
        milestone
    });


  return data.lead || null;
}


/* =========================================================
 * OUTCOME
 * ========================================================= */

async function setCrmOutcome(
  leadId,
  outcome
) {

  const data =
    await crmApiPost({

      action:
        "setOutcome",

      leadId:
        leadId,

      outcome:
        outcome
    });


  return data.lead || null;
}
