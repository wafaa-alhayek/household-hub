// Proxies chat requests to free models on OpenRouter (openrouter.ai), using the
// existing AI_API_KEY environment variable already set in Netlify (Site
// configuration -> Environment variables). No cost: both models below have the
// ":free" suffix, which OpenRouter serves at no charge.
//
// Free models share a rate-limited pool per upstream provider, so FREE_MODELS
// tries each in order and falls through to the next on a rate-limit/error —
// they're on different upstream providers so they don't get limited together.
// The frontend (index.html -> callAI) sends/expects Anthropic-shaped JSON
// ({model, max_tokens, system, messages} in / {content:[{type:"text",text}]}
// out) so this function translates to/from OpenRouter's OpenAI-compatible
// format. See https://openrouter.ai/models?max_price=0 for the current list
// of ":free" options if these need swapping out.
const FREE_MODELS = ["google/gemma-4-31b-it:free", "deepseek/deepseek-v4-flash-0731:free"];

async function tryModel(model, key, orMessages, max_tokens) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
    body: JSON.stringify({ model, messages: orMessages, max_tokens, reasoning: { enabled: false } })
  });
  if (!res.ok) return { ok: false, status: res.status, text: await res.text() };
  const data = await res.json();
  const text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
  return { ok: true, text };
}

exports.handler = async (event) => {
  const key = process.env.AI_API_KEY;
  if (event.httpMethod === "GET") {
    return { statusCode: key ? 200 : 503, body: key ? "ok" : "AI_API_KEY not set on server" };
  }
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  if (!key) return { statusCode: 503, body: JSON.stringify({ error: { message: "AI_API_KEY not set on server" } }) };
  try {
    const { system, messages, max_tokens } = JSON.parse(event.body || "{}");
    const orMessages = system ? [{ role: "system", content: system }, ...(messages || [])] : (messages || []);
    let last;
    for (const model of FREE_MODELS) {
      last = await tryModel(model, key, orMessages, max_tokens || 600);
      if (last.ok) return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: [{ type: "text", text: last.text }] }) };
    }
    return { statusCode: last.status, headers: { "Content-Type": "application/json" }, body: last.text };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: { message: String(e) } }) };
  }
};
