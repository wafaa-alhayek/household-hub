// Proxies chat requests to free models on OpenRouter (openrouter.ai), using the
// existing AI_API_KEY environment variable already set in Netlify (Site
// configuration -> Environment variables).
//
// Free model slugs come and go — OpenRouter retires a ":free" tier with no
// warning and answers 404 with "the paid version is available now, use this
// slug instead". So both lists below are overridable at runtime via env vars,
// and swapping a dead model costs ZERO deploy credits: set TEXT_MODELS (or
// VISION_MODELS) in Netlify -> Environment variables to a comma-separated list
// from https://openrouter.ai/models?max_price=0 and the next invocation picks
// it up. Leave them unset to use the defaults here.
//
// Only ":free" slugs are ever called. OpenRouter's own 404 message points at
// the PAID slug of the retired model, so following that hint — by hand or by
// pasting it into the env var — would start charging the account. Non-free
// entries are dropped and the reason is reported, never silently used.
const DEFAULT_TEXT_MODELS = "google/gemma-4-31b-it:free";
const DEFAULT_VISION_MODELS = "google/gemma-4-31b-it:free";

function modelList(envValue, fallback) {
  const raw = (envValue || fallback).split(",").map(m => m.trim()).filter(Boolean);
  return { use: raw.filter(m => m.endsWith(":free")), rejected: raw.filter(m => !m.endsWith(":free")) };
}

// Pull a human-readable reason out of whatever the upstream returned.
function upstreamMessage(text) {
  try {
    const j = JSON.parse(text);
    return (j.error && (j.error.message || j.error.code)) || JSON.stringify(j).slice(0, 200);
  } catch (e) {
    return (text || "").slice(0, 200) || "no response body";
  }
}

// A free-tier 429 is usually a momentary burst limit rather than the daily cap,
// so one short retry recovers it. Retrying more would just burn the same quota.
const RETRY_STATUSES = [429, 502, 503, 529];
async function tryModelWithRetry(model, key, orMessages, max_tokens) {
  let r = await tryModel(model, key, orMessages, max_tokens);
  if (!r.ok && RETRY_STATUSES.includes(r.status)) {
    await new Promise(res => setTimeout(res, 1200));
    const again = await tryModel(model, key, orMessages, max_tokens);
    if (again.ok) return again;
    return { ...again, retried: true };
  }
  return r;
}
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
  const text = modelList(process.env.TEXT_MODELS, DEFAULT_TEXT_MODELS);
  const vision = modelList(process.env.VISION_MODELS, DEFAULT_VISION_MODELS);

  if (event.httpMethod === "GET") {
    // Reports the live configuration so a failure can be diagnosed from the app
    // itself, without a redeploy or a look at the Netlify logs.
    return {
      statusCode: key ? 200 : 503,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: !!key,
        error: key ? undefined : "AI_API_KEY not set on server",
        textModels: text.use, visionModels: vision.use,
        ignoredNotFree: [...new Set([...text.rejected, ...vision.rejected])]
      })
    };
  }
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  if (!key) return { statusCode: 503, body: JSON.stringify({ error: { message: "AI_API_KEY not set on server" } }) };

  try {
    const { system, messages, max_tokens, vision: wantsVision } = JSON.parse(event.body || "{}");
    const picked = wantsVision ? vision : text;
    if (!picked.use.length) {
      return { statusCode: 503, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: { message:
        `No free model configured${picked.rejected.length ? ` — these were ignored for not ending in ":free": ${picked.rejected.join(", ")}` : ""}. `
        + `Set ${wantsVision ? "VISION_MODELS" : "TEXT_MODELS"} in Netlify to a ":free" slug from https://openrouter.ai/models?max_price=0` } }) };
    }

    const orMessages = system ? [{ role: "system", content: system }, ...(messages || [])] : (messages || []);
    const attempts = [];
    for (const model of picked.use) {
      const r = await tryModelWithRetry(model, key, orMessages, max_tokens || 600);
      if (r.ok) return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: [{ type: "text", text: r.text }] }) };
      attempts.push({ model, status: r.status, message: upstreamMessage(r.text), retried: !!r.retried });
    }

    // Report EVERY model that was tried. Returning only the last one's error hid
    // why the earlier models failed, which made a dead free tier look like a
    // problem with whichever model happened to be last in the list.
    const detail = attempts.map(a => `${a.model} → ${a.status}: ${a.message}${a.retried ? " (retried once)" : ""}`).join(" | ");
    const allGone = attempts.every(a => a.status === 404 || /unavailable for free|no longer|not found/i.test(a.message));
    // Rate-limited is a very different problem from retired, and conflating the two
    // sends you hunting for a replacement model when the model is fine.
    const rateLimited = attempts.some(a => a.status === 429);
    return {
      statusCode: attempts[attempts.length - 1].status || 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: { message: detail + (allGone
        ? ` || FIX: every configured free model is gone. Set TEXT_MODELS in Netlify -> Environment variables to a ":free" slug from https://openrouter.ai/models?max_price=0 (no redeploy needed). Do NOT use the paid slug OpenRouter suggests — it bills the account.`
        : rateLimited
        ? ` || RATE LIMITED, not retired — the model is fine, the free quota is spent. ${picked.use.length === 1
            ? `Only one model is configured, so there was nothing to fall back to: add more ":free" slugs to ${wantsVision ? "VISION_MODELS" : "TEXT_MODELS"} (comma-separated, different providers) so one provider's limit doesn't stop the app.`
            : `All ${picked.use.length} configured models are limited right now.`} OpenRouter also raises the free-tier daily cap once the account holds credit — check the limits on your key's page.`
        : "") } })
    };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: { message: String(e) } }) };
  }
};
