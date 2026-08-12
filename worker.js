export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // =====================================================
    // CRM API PROXY
    // =====================================================

    if (url.pathname === "/api") {

      if (!env.CRM_API_URL) {
        return jsonResponse(
          {
            success: false,
            error: "CRM_API_URL environment variable is missing."
          },
          500
        );
      }

      if (!env.CRM_PROXY_SECRET) {
        return jsonResponse(
          {
            success: false,
            error: "CRM_PROXY_SECRET environment variable is missing."
          },
          500
        );
      }

      /*
       * Cloudflare Access injects the authenticated
       * user's email into this request.
       */
      const authenticatedEmail =
        request.headers.get(
          "Cf-Access-Authenticated-User-Email"
        );

      if (!authenticatedEmail) {
        return jsonResponse(
          {
            success: false,
            error: "Authenticated user email is missing."
          },
          401
        );
      }

      try {
        const appsScriptUrl =
          new URL(env.CRM_API_URL);

        /*
         * Forward original API query parameters.
         */
        url.searchParams.forEach(
          (value, key) => {
            appsScriptUrl.searchParams.set(
              key,
              value
            );
          }
        );

        /*
         * Add trusted identity information.
         */
        appsScriptUrl.searchParams.set(
          "authenticatedEmail",
          authenticatedEmail
        );

        /*
         * Shared secret proves that the request
         * came through our Cloudflare Worker.
         */
        appsScriptUrl.searchParams.set(
          "proxySecret",
          env.CRM_PROXY_SECRET
        );

        const response =
          await fetch(
            appsScriptUrl.toString(),
            {
              method: request.method,
              redirect: "follow"
            }
          );

        return new Response(
          response.body,
          {
            status: response.status,
            headers: {
              "Content-Type":
                response.headers.get(
                  "Content-Type"
                ) ||
                "application/json"
            }
          }
        );

      } catch (error) {
        return jsonResponse(
          {
            success: false,
            error:
              error.message ||
              String(error)
          },
          500
        );
      }
    }

    // =====================================================
    // STATIC CRM FRONTEND
    // =====================================================

    return env.ASSETS.fetch(request);
  }
};


/**
 * Standard JSON response helper.
 */
function jsonResponse(
  data,
  status = 200
) {
  return new Response(
    JSON.stringify(data),
    {
      status: status,
      headers: {
        "Content-Type":
          "application/json"
      }
    }
  );
}
