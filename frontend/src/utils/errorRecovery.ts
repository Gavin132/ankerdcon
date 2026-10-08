import { clearPersistedQueries } from "../lib/queryPersist";

const RELOAD_KEY = "ankerd-error-reload-at";
const RELOAD_COOLDOWN_MS = 10_000;
/** Cleaning up must never be what keeps someone on the error screen. */
const CLEANUP_TIMEOUT_MS = 1_500;

/**
 * The first crash within a 10s window triggers one automatic reload, which
 * recovers the common transient case (e.g. a stale auth token racing a
 * refresh) for free. Shared between the top-level `ErrorBoundary` (catches
 * errors from outside the router tree) and `RouteErrorFallback` (catches
 * errors from route elements — React Router's data router has its own
 * internal error handling that intercepts those before a class component
 * wrapping `RouterProvider` would ever see them).
 *
 * Returns true if a reload was triggered (caller should render a spinner
 * while it happens); false means this crash struck again shortly after an
 * already-attempted reload, so the caller should show a real fallback
 * screen instead of looping forever. Also false when sessionStorage is
 * unavailable (private mode, blocked site data): without it there is no way
 * to tell a second crash from a first, and reloading blindly could loop.
 */
export function attemptAutoReload(): boolean {
  try {
    const lastReload = Number(sessionStorage.getItem(RELOAD_KEY) ?? "0");
    const now = Date.now();
    if (now - lastReload > RELOAD_COOLDOWN_MS) {
      sessionStorage.setItem(RELOAD_KEY, String(now));
      window.location.reload();
      return true;
    }
  } catch {
    // fall through: show the fallback screen
  }
  return false;
}

/** Drops the service worker and its caches, so the next load fetches the app fresh. */
async function dropOfflineCopies(): Promise<void> {
  const steps: Promise<unknown>[] = [];
  if ("serviceWorker" in navigator) {
    steps.push(
      navigator.serviceWorker.getRegistrations().then((regs) => Promise.all(regs.map((r) => r.unregister()))),
    );
  }
  if ("caches" in window) {
    steps.push(caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n)))));
  }
  await Promise.allSettled(steps);
}

/**
 * What the buttons on the error screen do. A plain reload gets the same app,
 * reading the same saved data, and so crashes the same way — for anyone whose
 * crash comes from what this device has stored, that is a loop with no way
 * out. So this throws away what can be rebuilt from the server (the saved query
 * cache, the offline copy of the app) and then loads `to` from scratch. Signing
 * in, settings and tickets are stored elsewhere and are left alone.
 */
export async function resetAppAndReload(to?: string): Promise<void> {
  try {
    await Promise.race([dropOfflineCopies(), new Promise((resolve) => setTimeout(resolve, CLEANUP_TIMEOUT_MS))]);
  } catch {
    // reload anyway
  }
  // Last, and synchronously: the query cache writes itself back on a timer, so
  // clearing it earlier could be undone before the page is gone.
  clearPersistedQueries();
  if (to) window.location.assign(to);
  else window.location.reload();
}
