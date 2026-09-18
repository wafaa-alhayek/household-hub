# بيت العائلة — v2 deploy folder

## What to do
1. This repo is linked to Netlify: push to `main` and it auto-deploys in ~30-60s. No more dragging folders.
2. Open the link on each phone **once while online**. From then on it opens with no internet too.
   - iPhone: Safari → Share → Add to Home Screen.  Android: Chrome → menu → Install app / Add to Home Screen.

## AI — no key needed on phones
`netlify/functions/ai.js` calls a free model on **OpenRouter** using an `AI_API_KEY` environment variable already set in Netlify (Site configuration → Environment variables) — nothing to paste on any phone, and it costs nothing (the model has a `:free` suffix).
- Don't remove/rename the `AI_API_KEY` variable in Netlify, or the function stops working.
- Test it: in the app go to المزيد → 🤖 المساعد الذكي → press **🧪 اختبار المساعد**. It should say ✅.
- The "paste your own key" fields under 🤖 المساعد الذكي still exist as a manual fallback, but shouldn't be needed.

## What changed in v2
- ☀️ اليوم tab: my tasks for today as big checkboxes, streak (current / longest / total), 16-week activity heatmap, weekly leaderboard, pending messages, shopping count.
- 🧹 المهام: chores can be daily / specific weekdays / one-off; monthly calendar with per-person dots; tap a day to see what was done and what was due (and tick it late).
- 🛒 التسوق: optional quantity, price, note; running total of the list.
- 💬 الشكاوى: when connected, no codes anywhere — sending is one button and the other person gets a "📩 وصلتك رسالة" card. Codes only appear if the cloud is off.
- ⚙️ المزيد: a menu with one screen per topic instead of one long page.
- 🤖 AI errors are now shown in the chat (red bubble) instead of silently falling back to canned questions.
- Works offline from the link after the first visit (service worker); data syncs when back online (Firestore offline cache).
