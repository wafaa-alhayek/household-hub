// Proxies chat requests to a free model on OpenRouter (openrouter.ai), using the
// existing AI_API_KEY environment variable already set in Netlify (Site
// configuration -> Environment variables). No cost: FREE_MODEL below has the
// ":free" suffix, which OpenRouter serves at no charge.
//
// The frontend (index.html -> callAI) sends/expects Anthropic-shaped JSON
// ({model, max_tokens, system, messages} in / {content:[{type:"text",text}]}
// out) so this function translates to/from OpenRouter's OpenAI-compatible
// format. Change FREE_MODEL to swap models; see https://openrouter.ai/models?max_price=0
// for the current list of ":free" options.
const FREE_MODEL = "deepseek/deepseek-v4-flash-0731:free";

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
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify({ model: FREE_MODEL, messages: orMessages, max_tokens: max_tokens || 600 })
    });
    if (!res.ok) {
      const text = await res.text();
      return { statusCode: res.status, headers: { "Content-Type": "application/json" }, body: text };
    }
    const data = await res.json();
    const text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: [{ type: "text", text }], _debug: data }) };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: { message: String(e) } }) };
  }
};
