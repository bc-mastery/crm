/**
 * Business Canvas CRM
 * Shared browser cache
 *
 * Layers:
 * 1. In-memory cache
 * 2. localStorage cache
 * 3. CRM API
 *
 * Strategy:
 * - Return cached data immediately when possible.
 * - Refresh stale/shared data quietly in the background.
 * - Keep Lead detail records cached between page visits.
 */


/* =========================================================
 * CONFIG
 * ========================================================= */

const CRM_CACHE_CONFIG = {

  prefix:
    "bc_crm_",

  /*
   * Lead database.
   *
   * Cached data is shown immediately.
   * Background refresh keeps it current.
   */
  leadsTtlMs:
    5 * 60 * 1000,

  /*
   * Full individual Lead records.
   */
  leadDetailTtlMs:
    10 * 60 * 1000,

  /*
   * CRM metadata changes rarely.
   */
  metaTtlMs:
    30 * 60 * 1000
};


/* =========================================================
 * MEMORY CACHE
 * ========================================================= */

const CRM_BROWSER_CACHE = {

  leads:
    null,

  leadsSavedAt:
    0,

  leadDetails:
    new Map(),

  meta:
    null,

  metaSavedAt:
    0,

  leadsRequest:
    null,

  metaRequest:
    null,

  leadRequests:
    new Map()
};


/* =========================================================
 * STORAGE KEYS
 * ========================================================= */

function crmCacheKey(
  name
) {

  return (
    CRM_CACHE_CONFIG.prefix +
    name
  );
}


function crmLeadCacheKey(
  leadId
) {

  return crmCacheKey(
    "lead_" +
    String(leadId || "")
  );
}


/* =========================================================
 * LOCAL STORAGE HELPERS
 * ========================================================= */

function readCrmStorage(
  key
) {

  try {

    const raw =
      localStorage.getItem(
        key
      );


    if (!raw) {
      return null;
    }


    const parsed =
      JSON.parse(raw);


    if (
      !parsed ||
      typeof parsed !==
        "object"
    ) {

      return null;
    }


    return parsed;


  } catch (error) {

    console.warn(
      "CRM cache read failed:",
      key,
      error
    );


    return null;
  }
}


function writeCrmStorage(
  key,
  value,
  savedAt = Date.now()
) {

  try {

    localStorage.setItem(
      key,
      JSON.stringify({
        savedAt:
          savedAt,

        value:
          value
      })
    );


  } catch (error) {

    /*
     * Cache failure must never break CRM.
     */
    console.warn(
      "CRM cache write failed:",
      key,
      error
    );
  }
}


function removeCrmStorage(
  key
) {

  try {

    localStorage.removeItem(
      key
    );

  } catch (error) {

    console.warn(
      "CRM cache removal failed:",
      key,
      error
    );
  }
}


/* =========================================================
 * AGE
 * ========================================================= */

function isCrmCacheFresh(
  savedAt,
  ttl
) {

  if (!savedAt) {
    return false;
  }


  return (
    Date.now() - savedAt
  ) < ttl;
}


/* =========================================================
 * EVENTS
 * ========================================================= */

function dispatchCrmCacheEvent(
  type,
  detail = {}
) {

  window.dispatchEvent(
    new CustomEvent(
      type,
      {
        detail:
          detail
      }
    )
  );
}


/* =========================================================
 * LEAD DATABASE
 * ========================================================= */

function getStoredCrmLeads() {

  /*
   * Memory first.
   */
  if (
    Array.isArray(
      CRM_BROWSER_CACHE.leads
    )
  ) {

    return {
      value:
        CRM_BROWSER_CACHE.leads,

      savedAt:
        CRM_BROWSER_CACHE
          .leadsSavedAt
    };
  }


  /*
   * Then localStorage.
   */
  const stored =
    readCrmStorage(
      crmCacheKey(
        "leads"
      )
    );


  if (
    stored &&
    Array.isArray(
      stored.value
    )
  ) {

    CRM_BROWSER_CACHE.leads =
      stored.value;


    CRM_BROWSER_CACHE.leadsSavedAt =
      Number(
        stored.savedAt || 0
      );


    return {
      value:
        stored.value,

      savedAt:
        CRM_BROWSER_CACHE
          .leadsSavedAt
    };
  }


  return null;
}


/**
 * Fetch fresh Lead database from API.
 */
async function refreshCrmLeadsCache() {

  /*
   * Prevent duplicate simultaneous
   * lead-list requests.
   */
  if (
    CRM_BROWSER_CACHE
      .leadsRequest
  ) {

    return CRM_BROWSER_CACHE
      .leadsRequest;
  }


  CRM_BROWSER_CACHE
    .leadsRequest =
      getCrmLeads()
        .then(
          leads => {

            const safeLeads =
              Array.isArray(leads)
                ? leads
                : [];


            const savedAt =
              Date.now();


            CRM_BROWSER_CACHE.leads =
              safeLeads;


            CRM_BROWSER_CACHE
              .leadsSavedAt =
                savedAt;


            writeCrmStorage(
              crmCacheKey(
                "leads"
              ),
              safeLeads,
              savedAt
            );


            dispatchCrmCacheEvent(
              "crm-leads-updated",
              {
                leads:
                  safeLeads,

                savedAt:
                  savedAt
              }
            );


            return safeLeads;
          }
        )
        .finally(
          () => {

            CRM_BROWSER_CACHE
              .leadsRequest =
                null;
          }
        );


  return CRM_BROWSER_CACHE
    .leadsRequest;
}


/**
 * Main Lead database getter.
 *
 * If cache exists:
 * - return immediately
 * - refresh quietly when stale
 *
 * If cache does not exist:
 * - API request required
 */
async function getCachedCrmLeads(
  options = {}
) {

  const forceRefresh =
    options.forceRefresh ===
      true;


  const backgroundRefresh =
    options.backgroundRefresh !==
      false;


  const cached =
    getStoredCrmLeads();


  if (
    cached &&
    !forceRefresh
  ) {

    const fresh =
      isCrmCacheFresh(
        cached.savedAt,
        CRM_CACHE_CONFIG
          .leadsTtlMs
      );


    /*
     * Even stale data renders instantly.
     */
    if (
      !fresh &&
      backgroundRefresh
    ) {

      refreshCrmLeadsCache()
        .catch(
          error => {

            console.warn(
              "Background Lead refresh failed:",
              error
            );
          }
        );
    }


    return cached.value;
  }


  return refreshCrmLeadsCache();
}


/* =========================================================
 * INDIVIDUAL LEAD
 * ========================================================= */

function getStoredCrmLead(
  leadId
) {

  if (!leadId) {
    return null;
  }


  /*
   * Memory.
   */
  const memory =
    CRM_BROWSER_CACHE
      .leadDetails
      .get(
        leadId
      );


  if (memory) {

    return memory;
  }


  /*
   * localStorage.
   */
  const stored =
    readCrmStorage(
      crmLeadCacheKey(
        leadId
      )
    );


  if (
    stored &&
    stored.value
  ) {

    const record = {

      value:
        stored.value,

      savedAt:
        Number(
          stored.savedAt || 0
        )
    };


    CRM_BROWSER_CACHE
      .leadDetails
      .set(
        leadId,
        record
      );


    return record;
  }


  return null;
}


/**
 * Store one complete Lead record.
 */
function cacheCrmLead(
  lead
) {

  if (
    !lead ||
    !lead.Lead_id
  ) {

    return;
  }


  const leadId =
    String(
      lead.Lead_id
    );


  const savedAt =
    Date.now();


  const record = {

    value:
      lead,

    savedAt:
      savedAt
  };


  CRM_BROWSER_CACHE
    .leadDetails
    .set(
      leadId,
      record
    );


  writeCrmStorage(
    crmLeadCacheKey(
      leadId
    ),
    lead,
    savedAt
  );


  /*
   * If the Lead database is already
   * cached, update its matching row too.
   */
  patchCachedCrmLeadSummary(
    lead
  );


  dispatchCrmCacheEvent(
    "crm-lead-updated",
    {
      lead:
        lead,

      leadId:
        leadId
    }
  );
}


/**
 * Get complete Lead record.
 */
async function getCachedCrmLead(
  leadId,
  options = {}
) {

  if (!leadId) {

    throw new Error(
      "Lead ID is required."
    );
  }


  const forceRefresh =
    options.forceRefresh ===
      true;


  const cached =
    getStoredCrmLead(
      leadId
    );


  if (
    cached &&
    !forceRefresh
  ) {

    const fresh =
      isCrmCacheFresh(
        cached.savedAt,
        CRM_CACHE_CONFIG
          .leadDetailTtlMs
      );


    /*
     * Fresh full Lead:
     * zero API request.
     */
    if (fresh) {

      return cached.value;
    }
  }


  /*
   * Prevent duplicate requests for
   * the same Lead.
   */
  const existingRequest =
    CRM_BROWSER_CACHE
      .leadRequests
      .get(
        leadId
      );


  if (existingRequest) {

    return existingRequest;
  }


  const request =
    getCrmLead(
      leadId
    )
      .then(
        lead => {

          if (lead) {

            cacheCrmLead(
              lead
            );
          }


          return lead;
        }
      )
      .finally(
        () => {

          CRM_BROWSER_CACHE
            .leadRequests
            .delete(
              leadId
            );
        }
      );


  CRM_BROWSER_CACHE
    .leadRequests
    .set(
      leadId,
      request
    );


  return request;
}


/* =========================================================
 * PATCH LEAD LIST
 * ========================================================= */

function patchCachedCrmLeadSummary(
  updatedLead
) {

  const cached =
    getStoredCrmLeads();


  if (
    !cached ||
    !Array.isArray(
      cached.value
    )
  ) {

    return;
  }


  const index =
    cached.value
      .findIndex(
        lead =>
          String(
            lead.Lead_id || ""
          ) ===
          String(
            updatedLead.Lead_id || ""
          )
      );


  if (
    index === -1
  ) {

    return;
  }


  cached.value[index] = {

    ...cached.value[index],

    ...updatedLead
  };


  const savedAt =
    Date.now();


  CRM_BROWSER_CACHE.leads =
    cached.value;


  CRM_BROWSER_CACHE
    .leadsSavedAt =
      savedAt;


  writeCrmStorage(
    crmCacheKey(
      "leads"
    ),
    cached.value,
    savedAt
  );
}


/* =========================================================
 * META
 * ========================================================= */

function getStoredCrmMeta() {

  if (
    CRM_BROWSER_CACHE.meta
  ) {

    return {
      value:
        CRM_BROWSER_CACHE.meta,

      savedAt:
        CRM_BROWSER_CACHE
          .metaSavedAt
    };
  }


  const stored =
    readCrmStorage(
      crmCacheKey(
        "meta"
      )
    );


  if (
    stored &&
    stored.value
  ) {

    CRM_BROWSER_CACHE.meta =
      stored.value;


    CRM_BROWSER_CACHE
      .metaSavedAt =
        Number(
          stored.savedAt || 0
        );


    return {
      value:
        stored.value,

      savedAt:
        CRM_BROWSER_CACHE
          .metaSavedAt
    };
  }


  return null;
}


async function refreshCrmMetaCache() {

  if (
    CRM_BROWSER_CACHE
      .metaRequest
  ) {

    return CRM_BROWSER_CACHE
      .metaRequest;
  }


  CRM_BROWSER_CACHE
    .metaRequest =
      getCrmMeta()
        .then(
          meta => {

            const savedAt =
              Date.now();


            CRM_BROWSER_CACHE.meta =
              meta;


            CRM_BROWSER_CACHE
              .metaSavedAt =
                savedAt;


            writeCrmStorage(
              crmCacheKey(
                "meta"
              ),
              meta,
              savedAt
            );


            return meta;
          }
        )
        .finally(
          () => {

            CRM_BROWSER_CACHE
              .metaRequest =
                null;
          }
        );


  return CRM_BROWSER_CACHE
    .metaRequest;
}


async function getCachedCrmMeta(
  options = {}
) {

  const forceRefresh =
    options.forceRefresh ===
      true;


  const cached =
    getStoredCrmMeta();


  if (
    cached &&
    !forceRefresh
  ) {

    if (
      isCrmCacheFresh(
        cached.savedAt,
        CRM_CACHE_CONFIG
          .metaTtlMs
      )
    ) {

      return cached.value;
    }
  }


  return refreshCrmMetaCache();
}


/* =========================================================
 * WRITE SYNCHRONIZATION
 * ========================================================= */

/**
 * Call this whenever an API write returns
 * a complete updated Lead.
 */
function acceptCrmLeadIntoCache(
  updatedLead
) {

  cacheCrmLead(
    updatedLead
  );
}


/* =========================================================
 * INVALIDATION
 * ========================================================= */

function invalidateCrmLeadCache(
  leadId
) {

  if (!leadId) {
    return;
  }


  CRM_BROWSER_CACHE
    .leadDetails
    .delete(
      leadId
    );


  removeCrmStorage(
    crmLeadCacheKey(
      leadId
    )
  );
}


function invalidateCrmLeadsCache() {

  CRM_BROWSER_CACHE.leads =
    null;


  CRM_BROWSER_CACHE
    .leadsSavedAt =
      0;


  removeCrmStorage(
    crmCacheKey(
      "leads"
    )
  );
}


function invalidateCrmMetaCache() {

  CRM_BROWSER_CACHE.meta =
    null;


  CRM_BROWSER_CACHE
    .metaSavedAt =
      0;


  removeCrmStorage(
    crmCacheKey(
      "meta"
    )
  );
}


/* =========================================================
 * CLEAR ALL
 * ========================================================= */

function clearCrmBrowserCache() {

  invalidateCrmLeadsCache();

  invalidateCrmMetaCache();


  const prefix =
    CRM_CACHE_CONFIG.prefix;


  try {

    const keys = [];


    for (
      let index = 0;
      index < localStorage.length;
      index++
    ) {

      const key =
        localStorage.key(
          index
        );


      if (
        key &&
        key.startsWith(
          prefix + "lead_"
        )
      ) {

        keys.push(
          key
        );
      }
    }


    keys.forEach(
      key =>
        localStorage.removeItem(
          key
        )
    );


  } catch (error) {

    console.warn(
      "Could not clear CRM cache.",
      error
    );
  }


  CRM_BROWSER_CACHE
    .leadDetails
    .clear();
}
