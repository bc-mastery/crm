/**
 * Business Canvas CRM
 * Source field adapter
 *
 * Bridges the Lead Detail renderer from the former
 * Clutch-specific source field to the generic source model:
 *   Lead_source
 *   Source_url
 *   Source_intro
 *
 * Loaded after lead-detail.js and before the page controller.
 */

(function initializeCrmSourceFields() {

  if (
    typeof renderReadOnlyField !== "function" ||
    typeof getLeadDetailState !== "function"
  ) {
    return;
  }

  const baseRenderReadOnlyField =
    renderReadOnlyField;

  renderReadOnlyField = function(
    label,
    value,
    asLink = false
  ) {

    /*
     * lead-detail.js historically renders one "Clutch" field.
     * Replace that slot with the generic source fields without
     * changing the rest of the shared Lead Detail renderer.
     */
    if (label === "Clutch") {

      const state =
        getLeadDetailState();

      const lead =
        state?.selectedLead || {};

      return [

        baseRenderReadOnlyField(
          "Lead source",
          lead.Lead_source
        ),

        baseRenderReadOnlyField(
          "Source",
          lead.Source_url,
          true
        ),

        baseRenderReadOnlyField(
          "Source intro",
          lead.Source_intro
        )

      ].join("");
    }

    return baseRenderReadOnlyField(
      label,
      value,
      asLink
    );
  };

})();
