// Scheduled function (cron config below) — runs every ~30 min, finds chores due
// today with an unmet assignee, and sends a Web Push notification to that
// person's subscribed phone(s). Needs two secrets in Netlify env vars (Site
// configuration -> Environment variables), neither of which lives in the repo:
//   FIREBASE_SERVICE_ACCOUNT — full JSON key from Firebase Console -> Project
//     settings -> Service Accounts -> Generate new private key (paste the
//     whole JSON as the value).
//   VAPID_PRIVATE_KEY — the private half of the VAPID keypair (the public
//     half is embedded client-side in index.html).
import admin from "firebase-admin";
import webpush from "web-push";

const VAPID_PUBLIC_KEY = "BNHcQJh7XtObdVi9Dy3LczET1mZRwFPJ0Kn_TjPttoajiCtzy0-ZoSGiuJXvBcpdNTHriQbEEq7Uyo2Kg-clEQI";

function todayStrUTC() {
  return new Date().toISOString().slice(0, 10);
}
function isDueToday(chore, dateStr) {
  const d = new Date(dateStr + "T12:00:00Z").getUTCDay();
  if (chore.freq === "daily" || chore.freq === "weekly") return true;
  if (chore.freq === "days") return (chore.days || []).includes(d);
  if (chore.freq === "once") return Object.keys(chore.log || {}).length === 0;
  return true;
}

function ensureApp() {
  if (admin.apps.length) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT not set");
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
}

export default async () => {
  const vapidKey = process.env.VAPID_PRIVATE_KEY;
  if (!vapidKey) return new Response("VAPID_PRIVATE_KEY not set", { status: 503 });
  try {
    ensureApp();
  } catch (e) {
    return new Response("FIREBASE_SERVICE_ACCOUNT not set or invalid: " + e.message, { status: 503 });
  }
  webpush.setVapidDetails("mailto:noreply@example.com", VAPID_PUBLIC_KEY, vapidKey);

  const db = admin.firestore();
  const today = todayStrUTC();
  let sent = 0, cleaned = 0;

  const choresSnap = await db.collectionGroup("chores").get();
  for (const doc of choresSnap.docs) {
    const chore = doc.data();
    if (!chore.assignee || chore.assignee === "anyone") continue; // avoid spamming everyone for unassigned chores
    if (chore.log && chore.log[today]) continue; // already done today
    if (!isDueToday(chore, today)) continue;
    if (chore.remindedDates && chore.remindedDates[today]) continue; // already reminded today

    const familyId = doc.ref.parent.parent.id;
    const subsSnap = await db.collection("families").doc(familyId).collection("pushSubs")
      .where("memberId", "==", chore.assignee).get();
    if (subsSnap.empty) continue;

    for (const subDoc of subsSnap.docs) {
      const sub = subDoc.data();
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify({ title: "🌅 بيت العائلة", body: `عندك مهمة اليوم: ${chore.title}`, tag: "hh-chore-" + doc.id, url: "./" })
        );
        sent++;
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) { await subDoc.ref.delete(); cleaned++; }
      }
    }
    await doc.ref.set({ remindedDates: { [today]: true } }, { merge: true });
  }

  return new Response(JSON.stringify({ ok: true, sent, cleaned }), { status: 200, headers: { "Content-Type": "application/json" } });
};

export const config = { schedule: "*/30 * * * *" };
