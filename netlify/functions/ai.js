// Proxies chat requests to Anthropic via Netlify's built-in AI Gateway.
// Netlify auto-injects ANTHROPIC_API_KEY + ANTHROPIC_BASE_URL into this function
// at runtime (once the site has a production deploy) — no API key ever stored
// on a phone. Do NOT set ANTHROPIC_API_KEY yourself in Site configuration ->
// Environment variables: that overrides the Gateway's key and breaks this.
exports.handler = async (event) => {
  const key = process.env.ANTHROPIC_API_KEY;
  const baseUrl = process.env.ANTHROPIC_BASE_URL;
  const ready = !!(key && baseUrl);
  if (event.httpMethod === "GET") {
    return { statusCode: ready ? 200 : 503, body: ready ? "ok" : "AI Gateway not active yet" };
  }
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  if (!ready) return { statusCode: 503, body: JSON.stringify({ error: { message: "AI Gateway not active yet — needs a production deploy, then a few minutes" } }) };
  try {
    const res = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: event.body
    });
    const text = await res.text();
    return { statusCode: res.status, headers: { "Content-Type": "application/json" }, body: text };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: { message: String(e) } }) };
  }
};
