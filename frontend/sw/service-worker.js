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
// Not per version, unlike the shell: a file with a hash in its name never changes, so builds can share one cache. A
// phone that opens a copy of the shell from an earlier build (the server was slow or restarting, see shellFirst) needs
// that build's own scripts, and a cache deleted with the old version left it asking the network for files the new
// deploy no longer has, or waiting for a server that does not answer, which is a blank page.
const ASSET_CACHE = "ankerd-assets";
// Roughly two or three builds of hashed files; the oldest go first.
const ASSET_CACHE_MAX_ENTRIES = 300;

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

// ── Web push ─────────────────────────────────────────────────────────────────
// The backend (app/services/push_service.py) sends {title, body, url} as the
// whole payload — nothing richer than that, so there's nothing to branch on
// here beyond showing it and opening `url` on tap.

self.addEventListener("push", (event) => {
  let payload = { title: "Ankerd Con", body: "" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // Not JSON (shouldn't happen from our own backend) — show the fallback title/body.
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Focus a tab already on the app rather than opening a second one —
      // exact path doesn't have to match, same origin is enough.
      for (const client of clientsList) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.focus();
          if ("navigate" in client) client.navigate(url);
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});

// A script that is not in the cache must come from the network, but not forever: a server that accepts the connection
// and does not answer left the page blank, with nothing to say why. After this the request fails, which the page
// (public/boot-guard.js) can see and recover from.
const ASSET_NETWORK_TIMEOUT_MS = 15000;

async function fetchWithTimeout(request, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Drops the oldest entries once the cache holds more than it should (keys come back in the order they were added). */
async function trimAssetCache(cache) {
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - ASSET_CACHE_MAX_ENTRIES))) await cache.delete(key);
}

/** Build output is named after its own content, so a hit can be served with no questions asked. */
async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  let failure;
  // Twice: the first request after a phone has been asleep often fails on a connection that is not up yet.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetchWithTimeout(request, ASSET_NETWORK_TIMEOUT_MS);
      if (response.ok) {
        await cache.put(request, response.clone());
        trimAssetCache(cache);
      }
      return response;
    } catch (err) {
      failure = err;
    }
  }
  throw failure;
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

// How long the network gets before falling back to the cached shell. Generous
// for a genuinely slow connection; still short next to how long a backend
// container takes to come up after a redeploy (its own docs put that at "a
// minute or two" — apt-get and pip install run on every restart), which is
// exactly the case this exists for: without it, a fetch to a host that's
// accepting the connection but not yet answering can hang far longer than
// this, and the tab is stuck on its own loading spinner with nothing to show
// for it — worse than a few-seconds-stale shell.
const SHELL_NETWORK_TIMEOUT_MS = 6000;

/**
 * Network-first for the HTML shell, falling back to cache when the request
 * fails outright or doesn't answer within SHELL_NETWORK_TIMEOUT_MS.
 *
 * index.html is the one file that names the current bundle, so a stale copy asks
 * for chunk filenames the newest deploy no longer has — half the app loads and
 * the rest 404s. Serving it because the network was merely *slow* would trade a
 * few seconds of waiting for a broken app, so the cached shell is kept mainly
 * for the offline case, where the matching bundle is cached alongside it — the
 * timeout below is the one deliberate exception, for a server that's up but not
 * yet answering rather than genuinely offline.
 */
async function shellFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SHELL_NETWORK_TIMEOUT_MS);
  try {
    const response = await fetch(request, { signal: controller.signal });
    if (response.ok) cache.put("/", response.clone());
    // The server (or Cloudflare in front of it) answered, but with an error page: the home server is off or
    // restarting. The shell we have opens the app on its saved data, which beats an error page.
    if (response.status >= 500) {
      const saved = (await cache.match("/")) ?? (await cache.match(request));
      if (saved) return saved;
    }
    return response;
  } catch (err) {
    const cached = (await cache.match("/")) ?? (await cache.match(request));
    if (cached) return cached;
    throw err;
  } finally {
    clearTimeout(timeout);
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
