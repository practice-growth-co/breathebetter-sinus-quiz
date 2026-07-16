/**
 * RSI Lead Relay — Cloudflare Worker
 *
 * Accepts the Sinus & Allergy Quiz's JSON submission and forwards it to the
 * RSI External Lead Webhook v2, adding the security headers server-side so
 * credentials never appear in page source.
 *
 * Required environment variables (Worker Settings -> Variables & Secrets,
 * add each as type "Secret"):
 *   RSI_API_KEY     - API key provided by RSI
 *   RSI_CLIENT_ID   - RSI client id (922 for BreatheBetter Institute)
 *   RSI_SIGNATURE   - fixed signature provided by RSI
 *
 * Optional plain-text variable:
 *   ALLOWED_ORIGINS - comma-separated list of origins allowed to call this
 *                     relay. If unset, all origins are allowed.
 *                     e.g. "https://www.breathebetterhuntsville.com,https://practice-growth-co.github.io"
 */

const RSI_ENDPOINT = "https://portal.redspotinteractive.com/api/v2/leads/webhook";

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405, cors);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400, cors);
    }

    // Mirror RSI's minimum requirements so bad submissions fail fast
    const hasName = (payload.firstName && payload.lastName) || payload.fullName;
    if (!hasName || (!payload.email && !payload.phone)) {
      return json({ error: "Missing required fields: name plus email or phone" }, 400, cors);
    }

    const resp = await fetch(RSI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RSI-API-KEY": env.RSI_API_KEY,
        "X-RSI-CLIENT-ID": env.RSI_CLIENT_ID,
        "X-RSI-SIGNATURE": env.RSI_SIGNATURE,
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      console.error("RSI rejected lead:", resp.status, await resp.text());
    }
    return json({ forwarded: resp.ok, rsiStatus: resp.status }, resp.ok ? 200 : 502, cors);
  },
};

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  return {
    "Access-Control-Allow-Origin": allowed.length === 0 ? "*" : (allowed.includes(origin) ? origin : allowed[0]),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(body, status, cors) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}
