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

const VERSION = "__SW_VERSION__";
const SHELL_CACHE = `ankerd-shell-${VERSION}`;
const ASSET_CACHE = `ankerd-assets-${VERSION}`;

// Enough to render the first screen offline; everything else arrives via the
// fetch handler as it gets used.
const SHELL_URLS = ["/", "/manifest.json", "/assets/images/ankerd-logo.webp", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
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

// The page asks for the update to be applied once the user agrees.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

/** Cache-first: these filenames carry a content hash, so they never change meaning. */
async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

/** Reception at an event can be slow rather than absent; don't wait forever on it. */
const SHELL_TIMEOUT_MS = 3500;

/**
 * Network-first for the HTML shell, with a deadline: a returning visitor should
 * get the newest index.html (it points at the new bundle), but nobody should
 * stare at a white screen because one request is crawling. Past the deadline we
 * serve the cached shell and let the real response finish in the background, so
 * the next start has it either way.
 */
async function shellFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  const network = fetch(request).then((response) => {
    if (response.ok) cache.put("/", response.clone());
    return response;
  });

  try {
    const cached = await cache.match("/");
    if (!cached) return await network;
    const timeout = new Promise((resolve) => setTimeout(() => resolve(null), SHELL_TIMEOUT_MS));
    return (await Promise.race([network.catch(() => null), timeout])) ?? cached;
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
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request));
  }
});
