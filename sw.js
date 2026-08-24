/* JOMERPBSTREAM service worker — app-shell cache.
 *
 * Why this exists: the shell is ~686KB (index.html + styles.css + the three tab
 * scripts) and, with no service worker, it was re-downloaded on every launch.
 * Measured cold on an emulated weak LTE profile at 4x CPU throttle: 3,696ms to
 * first contentful paint, against ~224ms when the same shell is served without
 * touching the network. That download IS the splash screen.
 *
 * ── Design notes, each one paid for by a bug found while testing ─────────────
 *
 * 1. PRECACHE THE VERSIONED URLS, NOT THE BARE FILENAMES.
 *    index.html requests `styles.css?v=20260818c`. A cache seeded with
 *    `./styles.css` misses every single one of those, and the page silently
 *    falls back to network while appearing to be "cached". The precache list is
 *    therefore PARSED OUT OF index.html rather than hardcoded here — the repo
 *    has no build step, and a second hardcoded copy of the ?v= strings is a
 *    guaranteed drift.
 *
 * 2. HTML IS NEVER CACHE-ONLY. It is stale-while-revalidate: the cached copy is
 *    served immediately (that is the speed win) while a fresh copy is fetched in
 *    the background for next launch. A plain cache-first HTML strategy is a
 *    ONE-WAY DOOR: the cached index.html carries the old <script> registration,
 *    so a later fix can never bootstrap itself and the only escape is for the
 *    user to uninstall the PWA. Reproduced in testing — two consecutive launches
 *    served stale code with the new code sitting on the server.
 *
 * 3. HTML AND ITS ASSETS ALWAYS COME FROM THE SAME GENERATION. Serving a cached
 *    index.html means serving the ?v= assets it references, which are in cache
 *    beside it. New markup against a stale script — the failure CLAUDE.md warns
 *    about — cannot happen here; an update simply lands one launch later.
 *
 * 4. LIVE DATA IS NEVER CACHED. Anything carrying ?nocache= (pcso-history.json,
 *    the pse-* feeds, oracle-history.json) goes straight to network, untouched.
 *
 * 5. THE WORKER ITSELF MUST STAY UPDATABLE. index.html registers with
 *    updateViaCache:'none' because the browser will otherwise serve sw.js from
 *    the HTTP cache and never notice a new one. GitHub Pages sends
 *    max-age=600 on everything, which is enough to strand a bad worker.
 */

const CACHE = 'jomerpb-shell-v1';   // bump only when the logic in this file changes
const HTML  = './index.html';

// Pull the ?v=-stamped asset URLs straight out of the deployed markup.
function assetsFrom(html) {
  const urls = new Set([HTML]);
  const re = /(?:src|href)="(\.?\/?(?:[\w./-]+)\?v=[\w.-]+)"/g;
  let m;
  while ((m = re.exec(html))) urls.add('./' + m[1].replace(/^\.?\//, ''));
  return [...urls];
}

// Fetch index.html bypassing the HTTP cache, then cache it and everything it names.
async function syncShell() {
  const cache = await caches.open(CACHE);
  const res = await fetch(HTML, { cache: 'no-cache' });
  if (!res.ok) throw new Error('shell fetch ' + res.status);
  const html = await res.clone().text();
  const wanted = assetsFrom(html);

  await cache.put(HTML, res);
  await Promise.all(wanted.filter(u => u !== HTML).map(async u => {
    if (await cache.match(u)) return;                    // already have this exact ?v=
    const r = await fetch(u, { cache: 'no-cache' });
    if (r.ok) await cache.put(u, r);
  }));

  // Drop entries the current markup no longer references (superseded ?v= builds).
  const keep = new Set(wanted.map(u => new URL(u, self.registration.scope).href));
  for (const req of await cache.keys()) {
    if (!keep.has(req.url)) await cache.delete(req);
  }
}

self.addEventListener('install', e => {
  e.waitUntil(syncShell().then(() => self.skipWaiting()).catch(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // TMDB, AniList, etc: untouched
  if (url.search.includes('nocache')) return;             // live data feeds: always network

  if (req.mode === 'navigate') {
    // stale-while-revalidate: instant paint now, fresh shell for next launch
    e.respondWith(
      caches.match(HTML).then(hit => {
        const net = syncShell().catch(() => {});
        if (hit) { e.waitUntil(net); return hit; }
        return net.then(() => caches.match(HTML)).then(r => r || fetch(req));
      })
    );
    return;
  }

  // Versioned assets: cache-first. A ?v= bump is a new key, so it misses and refetches.
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }))
  );
});
