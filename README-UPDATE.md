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

## Setup needed for this round — two new secrets in Netlify

Push notifications need two more environment variables (Netlify → Site configuration → Environment variables), on top of the existing `AI_API_KEY`. Neither goes in the repo.

1. **`VAPID_PRIVATE_KEY`** — Claude generated this keypair already; ask for the private key value (the public half is already in the code, in `index.html`'s `VAPID_PUBLIC_KEY`).
2. **`FIREBASE_SERVICE_ACCOUNT`** — Firebase Console → ⚙️ Project settings → Service accounts → **Generate new private key**. It downloads a `.json` file — open it and paste the **entire contents** as the value of this variable. Keep this file safe; it grants admin access to your Firestore.

After adding both and redeploying, notifications should work — test from a phone: المزيد → 🔔 التنبيهات → فعّل التنبيهات، allow the permission prompt.

## What changed in this round
- 📷 **QR linking**: connecting a new phone to the family is now scan-a-QR instead of typing a long code (المزيد → ☁️ الربط بين الجوالات). Manual entry still works as a fallback for phones that can't scan.
- 🔔 **Push notifications**: opt in from المزيد → 🔔 التنبيهات to get a real notification — even with the app closed — when you have an unfinished task due that day.
- 🙏 **"سويت شي اليوم؟"** on the اليوم tab: a short peer-validated log — say what you did, others tap to confirm it happened. No counts, no ranking; separate from the streak/leaderboard on purpose.
- 📜 **قواعد متفق عليها** on the الشكاوى tab: after a complaint is resolved, you can promote it into a standing house rule everyone can see — and the AI mediator now factors these into future cases.
- 🤖 The AI's summary/resolution text in a complaint is now shown as-is (can't be edited) so its wording can't be twisted — but you can add your own labeled note alongside it before sending. The AI also now can name a specific, clearly evidenced unfairness (not just describe things neutrally) when the facts genuinely support it — it stays neutral otherwise.

## What changed in v2
- ☀️ اليوم tab: my tasks for today as big checkboxes, streak (current / longest / total), 16-week activity heatmap, weekly leaderboard, pending messages, shopping count.
- 🧹 المهام: chores can be daily / specific weekdays / one-off; monthly calendar with per-person dots; tap a day to see what was done and what was due (and tick it late).
- 🛒 التسوق: optional quantity, price, note; running total of the list.
- 💬 الشكاوى: when connected, no codes anywhere — sending is one button and the other person gets a "📩 وصلتك رسالة" card. Codes only appear if the cloud is off.
- ⚙️ المزيد: a menu with one screen per topic instead of one long page.
- 🤖 AI errors are now shown in the chat (red bubble) instead of silently falling back to canned questions.
- Works offline from the link after the first visit (service worker); data syncs when back online (Firestore offline cache).
