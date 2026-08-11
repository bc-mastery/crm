export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Proxy CRM API requests to Apps Script
    if (url.pathname === "/api") {
      const appsScriptUrl = new URL(env.CRM_API_URL);

      // Forward all query parameters
      url.searchParams.forEach((value, key) => {
        appsScriptUrl.searchParams.set(key, value);
      });

      const response = await fetch(appsScriptUrl.toString(), {
        method: request.method,
        redirect: "follow"
      });

      return new Response(response.body, {
        status: response.status,
        headers: {
          "Content-Type":
            response.headers.get("Content-Type") ||
            "application/json"
        }
      });
    }

    // Everything else is served from static assets
    return env.ASSETS.fetch(request);
  }
};
