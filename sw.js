// Household Hub service worker: makes the app open with no internet after the first visit.
const CACHE = "hh-v2";
const PRECACHE = ["./", "./index.html", "./manifest.json"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // Firebase SDK modules from gstatic: cache-first (they never change for a pinned version)
  if (url.hostname === "www.gstatic.com") {
    e.respondWith(caches.open(CACHE).then(async c => { const hit = await c.match(e.request); if (hit) return hit; const res = await fetch(e.request); if (res.ok) c.put(e.request, res.clone()); return res; }));
    return;
  }
  // Our own files: network-first so updates arrive, cache fallback so it opens offline
  if (url.origin === location.origin) {
    e.respondWith(fetch(e.request).then(res => { if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone())); return res; })
      .catch(() => caches.match(e.request).then(hit => hit || caches.match("./index.html"))));
  }
  // Everything else (Firestore, Anthropic API): go to network, don't cache
});
