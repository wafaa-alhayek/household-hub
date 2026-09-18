# بيت العائلة — v2 deploy folder

## What to do (5 minutes)
1. Open `index.html` in a text editor. Near the top, in the boxed FIREBASE CONFIG block, replace the six `PASTE_…` values with yours (same values as before — Firebase Console → ⚙️ Project settings → Your apps). Only the six lines; nothing else.
2. Go to https://app.netlify.com → your site → **Deploys** → drag **this whole folder** (not just index.html) onto the page. Wait ~30s.
3. Open the link on each phone **once while online**. From then on it opens with no internet too.
   - iPhone: Safari → Share → Add to Home Screen.  Android: Chrome → menu → Install app / Add to Home Screen.

## AI — no key needed
This site uses Netlify's built-in **AI Gateway**, which is on by default on Netlify's free plan and needs no API key from you at all. `netlify/functions/ai.js` picks it up automatically the moment the site has a production deploy.
- Don't add an `ANTHROPIC_API_KEY` environment variable in Netlify — that overrides and disables the Gateway.
- After the first production deploy, give it a couple of minutes, then in the app go to المزيد → 🤖 المساعد الذكي → press **🧪 اختبار المساعد**. It should say ✅.
- If it still fails after a few minutes, redeploy once (Netlify → Deploys → Trigger deploy) — the Gateway only activates after a production deploy exists.
- The "paste your own key" fields under 🤖 المساعد الذكي still exist as a manual fallback (e.g. if AI features are disabled for the team), but shouldn't be needed.

## What changed in v2
- ☀️ اليوم tab: my tasks for today as big checkboxes, streak (current / longest / total), 16-week activity heatmap, weekly leaderboard, pending messages, shopping count.
- 🧹 المهام: chores can be daily / specific weekdays / one-off; monthly calendar with per-person dots; tap a day to see what was done and what was due (and tick it late).
- 🛒 التسوق: optional quantity, price, note; running total of the list.
- 💬 الشكاوى: when connected, no codes anywhere — sending is one button and the other person gets a "📩 وصلتك رسالة" card. Codes only appear if the cloud is off.
- ⚙️ المزيد: a menu with one screen per topic instead of one long page.
- 🤖 AI errors are now shown in the chat (red bubble) instead of silently falling back to canned questions.
- Works offline from the link after the first visit (service worker); data syncs when back online (Firestore offline cache).
