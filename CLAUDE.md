# بيت العائلة (Household Hub) — project brief

A private family app for 3 people (the owner, his sister, their mother) to manage chores, a shopping/restock list, and household complaints with an AI-assisted **private mediation** flow. Arabic, RTL, designed so an older, non-technical person can use it. Built and iterated with Claude; this file is the context Claude Code needs.

## Stack (deliberately minimal — keep it that way)
- **One static page**: `index.html` (vanilla JS, no framework, no build step). CSS/JS inline.
- **PWA**: `sw.js` + `manifest.json` + icons → opens offline after first visit.
- **Backend**: Firebase Firestore (offline persistence on) + Anonymous Auth. Config is in a small `<script>` block near the top of `index.html` (`window.FIREBASE_CONFIG`). Data lives under `families/{familyCode}/…`. The family code is a shared secret each phone types once; it is **never** in the repo.
- **AI**: `netlify/functions/ai.js` proxies to Anthropic via **Netlify AI Gateway** (`process.env.ANTHROPIC_BASE_URL` + `ANTHROPIC_API_KEY`, injected by Netlify). Do **not** add an `ANTHROPIC_API_KEY` env var in Netlify — that disables the gateway. Model is locked to `claude-haiku-4-5-20251001`, max_tokens capped at 600. Frontend falls back to a key shared via Firestore settings, then a per-phone key, if the function is absent.
- **Hosting**: Netlify, linked to this GitHub repo. Push to `main` = production deploy.

## Hard constraints — do not break
1. **Private chat threads never leave the phone.** `cases[].threadA` / `threadB` live only in localStorage. Only `neutralSummary`, `suggestions`, `proposedResolution` and stage go to Firestore (`cases` collection).
2. **Nothing becomes public without the other person tapping "أوافق".** The AI has no authority; it produces proposals only.
3. **Citation whitelist.** `QURAN_FRAMEWORK_ITEMS` is a small, source-verified list. `flagUnverifiedCitations()` appends a ⚠️ to any ayah/hadith/surah reference not in it. Never add entries without verifying the exact text against two sources; never let the model cite from memory.
4. **`CORE_GUARDRAILS`** (in `index.html`) always prefix every system prompt: no diagnosing people, no declaring who is "right", facts only from logged data, equal respect, de-escalate. User-editable persona/book rules are layered *after* it, never instead of it.
5. **User text goes into prompts as fenced data** via `fenced()` — never string-interpolated into instructions (prompt-injection guard).
6. **No secrets in the repo.** Firebase web config is fine (it's a public identifier); family code and any API key are not.
7. **Elderly-friendly UI**: base font 19px, tap targets ≥ 44px, one idea per screen, Arabic labels, minimal jargon. Don't add a framework, a build step, or clever UI for its own sake.
8. **Errors must be visible** — never silently fall back. Use `toast()` / red `.bubble.err` / `errorCard()`.

## Netlify credits — this matters
Free plan = 300 credits/month, hard cap; at 0 the site pauses. **Each production deploy = 15 credits.** AI use ≈ 1 credit per message. So: batch changes, test locally first (just open `index.html` in a browser — everything except the gateway works from file://), push once. Avoid pushing trivial tweaks.

## Data model (Firestore + localStorage mirror)
- `meta/settings`: `{members:[{id,name}], profiles:{memberId:{speak,values,wants,triggers,calm,note}}, aiKey, updatedAt}`
- `chores/{id}`: `{id,title,assignee(memberId|"anyone"),freq("daily"|"days"|"once"),days:[0-6],log:{"YYYY-MM-DD":{by,at}},createdAt,updatedAt}`
- `restock/{id}`: `{id,name,qty,price,note,status("needed"|"bought"),addedBy,addedAt,boughtBy,boughtAt,updatedAt}`
- `complaints/{id}` (agreed outcomes only): `{id,from,about,title,description,status:"resolved",createdAt,updatedAt}`
- `cases/{id}` (mediation hand-off, summaries only): `{id,from,about,title,stage,neutralSummary,suggestions,proposedResolution,updatedAt}`
  - stages: `draft_a → ready_to_send → sent → (other phone) received → b_ready → (back) awaiting_a → closed`
- Merge rule everywhere: `mergeArrayById` = last-write-wins by `updatedAt`.

## Screens (bottom tabs)
☀️ اليوم (my tasks today, streak + 16-week heatmap, weekly leaderboard) · 🧹 المهام (add chore, monthly calendar with per-person dots, all chores) · 🛒 التسوق (qty/price optional, running total) · 💬 الشكاوى (start private case, inbox of received cases, agreed log) · ⚙️ المزيد (menu → profile, family/names, stats, cloud, AI, Quran framework, persona, book rules, manual sync fallback).

## Testing
Open `index.html` directly in a browser to test UI/logic. The Firestore path works from a `http(s)` origin only after a family code is entered. To test the gateway locally use `netlify dev`. There is no automated test suite; a quick jsdom smoke test used during development checked: add chore → mark done → calendar detail → streak → restock total → open case modal → every settings sub-screen renders without an error card.

## Owner's intent (so changes stay on-purpose)
The goal is fairness that doesn't depend on who argues loudest: a dated, shared record; a mediator that can't be steered into taking sides; and a process where nothing is decided about someone without their explicit agreement. Gamification (streaks, leaderboard) is welcome; anything that shames or ranks people's *character* is not.
