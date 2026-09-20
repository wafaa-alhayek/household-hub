// Scheduled function (cron config below) — runs every ~30 min and sends Web Push
// for two things:
//   1. a scheduled chore that is due today and still unmet
//   2. a mediation case waiting on someone (a complaint arrived, or a reply came back)
// Needs two secrets in Netlify env vars (Site configuration -> Environment
// variables), neither of which lives in the repo:
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
  // "anytime" is as-needed and deliberately never "due" — it must mirror the
  // client's isDueToday(), or an unscheduled chore would be pushed every day.
  if (chore.freq === "anytime") return false;
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

  const subsCache = new Map();   // familyId -> [{ref, endpoint, keys, memberId}]
  const namesCache = new Map();  // familyId -> {memberId: name}

  async function subsFor(familyId) {
    if (!subsCache.has(familyId)) {
      const snap = await db.collection("families").doc(familyId).collection("pushSubs").get();
      subsCache.set(familyId, snap.docs.map(d => ({ ref: d.ref, ...d.data() })));
    }
    return subsCache.get(familyId);
  }
  async function nameOf(familyId, memberId) {
    if (!namesCache.has(familyId)) {
      const snap = await db.collection("families").doc(familyId).collection("meta").doc("settings").get();
      const members = (snap.exists && snap.data().members) || [];
      namesCache.set(familyId, Object.fromEntries(members.map(m => [m.id, m.name])));
    }
    return namesCache.get(familyId)[memberId] || "أحد أفراد العائلة";
  }
  // returns true if at least one phone accepted the notification
  async function pushTo(familyId, memberId, payload) {
    const mine = (await subsFor(familyId)).filter(s => s.memberId === memberId);
    let delivered = false;
    for (const sub of mine) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify(payload));
        sent++; delivered = true;
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) { await sub.ref.delete(); cleaned++; }
      }
    }
    return delivered;
  }

  // ---- 1. chores due today ----
  const choresSnap = await db.collectionGroup("chores").get();
  for (const doc of choresSnap.docs) {
    const chore = doc.data();
    if (!chore.assignee || chore.assignee === "anyone") continue; // avoid spamming everyone for unassigned chores
    if (chore.log && chore.log[today]) continue; // already done today
    if (!isDueToday(chore, today)) continue;
    if (chore.remindedDates && chore.remindedDates[today]) continue; // already reminded today

    const familyId = doc.ref.parent.parent.id;
    await pushTo(familyId, chore.assignee, {
      title: "🌅 بيت العائلة",
      body: `عندك مهمة اليوم: ${chore.title}`,
      tag: "hh-chore-" + doc.id, url: "./"
    });
    await doc.ref.set({ remindedDates: { [today]: true } }, { merge: true });
  }

  // ---- 2. mediation cases waiting on someone ----
  // Deliberately content-free: the body never carries neutralSummary, the title,
  // or any case text. A push preview shows on a lock screen that other people in
  // the house can see, and this is the one part of the app built on privacy.
  const casesSnap = await db.collectionGroup("cases").get();
  for (const doc of casesSnap.docs) {
    const c = doc.data();
    const round = c.round || 1;
    let target = null, key = null, body = null;

    if (c.stage === "sent" && !c.openedAt && c.about) {
      target = c.about; key = `sent:${round}`;
      body = `وصلتك رسالة خاصة من ${await nameOf(doc.ref.parent.parent.id, c.from)}`;
    } else if (c.stage === "b_ready" && c.from) {
      target = c.from; key = `b_ready:${round}`;
      body = `رد ${await nameOf(doc.ref.parent.parent.id, c.about)} جاهز`;
    }
    if (!target || (c.notified && c.notified[key])) continue;

    const familyId = doc.ref.parent.parent.id;
    await pushTo(familyId, target, { title: "💬 بيت العائلة", body, tag: "hh-case-" + doc.id, url: "./" });
    // Marked regardless of delivery: a phone with notifications off must not make
    // this case re-checked on every run forever.
    await doc.ref.set({ notified: { [key]: true } }, { merge: true });
  }

  return new Response(JSON.stringify({ ok: true, sent, cleaned }), { status: 200, headers: { "Content-Type": "application/json" } });
};

export const config = { schedule: "*/30 * * * *" };
