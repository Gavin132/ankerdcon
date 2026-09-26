/* eslint-disable no-undef */
/**
 * Ankerd Con service worker.
 *
 * Why it exists: the app is used in convention halls, where reception is often
 * somewhere between slow and absent. Without this, every cold start waits on the
 * network for the HTML and the whole JS bundle before anything appears.
 *
 * What it does NOT do: cache `/api/`. Data freshness is handled by the query
 * cache in localStorage, which knows what's stale and what to refetch; a second
 * opinion here would only serve yesterday's rides with no way to tell.
 *
 * Updates: a new worker installs in the background and then waits. The page
 * offers "Nieuwe versie" and reloads on demand (see useServiceWorker.ts), so a
 * new release is never applied underneath someone mid-action.
 */

// Unique per build, not per release: two builds of the same version number must
// still count as different workers, or the browser sees an identical file, skips
// the update, and keeps serving the previous build's caches indefinitely.
const VERSION = "__SW_VERSION__";
const SHELL_CACHE = `ankerd-shell-${VERSION}`;
const ASSET_CACHE = `ankerd-assets-${VERSION}`;

// Enough to render the first screen offline; everything else arrives via the
// fetch handler as it gets used.
const SHELL_URLS = ["/", "/manifest.json", "/assets/images/ankerd-logo.webp", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  // Take over as soon as this worker is ready rather than waiting for every tab
  // to close. A worker that waits is a worker that can't fix anything: if a
  // previous one ever leaves the app in a state that won't start, the user has
  // no way to reach the button that would replace it. The page still decides
  // when to *reload* — see UpdateBanner.
  self.skipWaiting();
  event.waitUntil(
    // One bad URL must not fail the whole install, so each is added on its own.
    caches.open(SHELL_CACHE).then((cache) => Promise.allSettled(SHELL_URLS.map((url) => cache.add(url)))),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== SHELL_CACHE && n !== ASSET_CACHE).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

/** Build output is named after its own content, so a hit can be served with no questions asked. */
async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

/**
 * For files we ship by hand — the logo, the app icons — whose names stay the
 * same while their contents can change. Serve the copy we have, fetch a newer
 * one for next time; caching these forever would freeze a replaced logo on
 * every device that had already seen the old one.
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => hit);
  return hit ?? network;
}

/**
 * Strictly network-first for the HTML shell, falling back to cache only when the
 * request actually fails.
 *
 * index.html is the one file that names the current bundle, so a stale copy asks
 * for chunk filenames the newest deploy no longer has — half the app loads and
 * the rest 404s. Serving it because the network was merely *slow* would trade a
 * few seconds of waiting for a broken app, so the cached shell is kept strictly
 * for the offline case, where the matching bundle is cached alongside it.
 */
async function shellFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put("/", response.clone());
    return response;
  } catch (err) {
    const cached = (await cache.match("/")) ?? (await cache.match(request));
    if (cached) return cached;
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // tiles, avatars, the CDN: left to the browser
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(shellFirst(request));
    return;
  }
  // Same rule the backend uses to decide what may be cached forever: a content
  // hash in the filename (index-8998340c.js), and nothing else.
  if (/-[0-9a-f]{8,}\.[a-z0-9]+$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
  } else if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
