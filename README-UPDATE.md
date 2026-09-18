# بيت العائلة — v2 deploy folder

## What to do (5 minutes)
1. Open `index.html` in a text editor. Near the top, in the boxed FIREBASE CONFIG block, replace the six `PASTE_…` values with yours (same values as before — Firebase Console → ⚙️ Project settings → Your apps). Only the six lines; nothing else.
2. Go to https://app.netlify.com → your site → **Deploys** → drag **this whole folder** (not just index.html) onto the page. Wait ~30s.
3. Open the link on each phone **once while online**. From then on it opens with no internet too.
   - iPhone: Safari → Share → Add to Home Screen.  Android: Chrome → menu → Install app / Add to Home Screen.

## AI key — do this ONCE, on one phone
المزيد → 🤖 المساعد الذكي → paste the key → keep "مشاركته مع العائلة" ticked → حفظ.
It syncs to the other phones through Firebase. Then press **🧪 اختبار المساعد** — it will say ✅ or tell you exactly what's wrong.
Most likely "wrong": no prepaid credit. Add ~$5 at https://console.anthropic.com → Billing.

## Optional: hide the key on the server (recommended once things work)
This folder already contains `netlify/functions/ai.js`. To activate it:
1. Netlify → your site → **Site configuration → Environment variables → Add a variable**
   Key: `ANTHROPIC_API_KEY`   Value: your key. Save.
2. Netlify → **Deploys → Trigger deploy** (or drag the folder again).
3. In the app, المزيد → 🤖 should now show "يشتغل عبر الخادم ✅". You can then delete the key from the phones.
If Netlify's drag-and-drop doesn't pick up the function (rare), the app just keeps using the shared key — nothing breaks.

## What changed in v2
- ☀️ اليوم tab: my tasks for today as big checkboxes, streak (current / longest / total), 16-week activity heatmap, weekly leaderboard, pending messages, shopping count.
- 🧹 المهام: chores can be daily / specific weekdays / one-off; monthly calendar with per-person dots; tap a day to see what was done and what was due (and tick it late).
- 🛒 التسوق: optional quantity, price, note; running total of the list.
- 💬 الشكاوى: when connected, no codes anywhere — sending is one button and the other person gets a "📩 وصلتك رسالة" card. Codes only appear if the cloud is off.
- ⚙️ المزيد: a menu with one screen per topic instead of one long page.
- 🤖 AI errors are now shown in the chat (red bubble) instead of silently falling back to canned questions.
- Works offline from the link after the first visit (service worker); data syncs when back online (Firestore offline cache).
