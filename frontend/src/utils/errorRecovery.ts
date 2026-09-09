const RELOAD_KEY = "ankerd-error-reload-at";
const RELOAD_COOLDOWN_MS = 10_000;

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
 * screen instead of looping forever.
 */
export function attemptAutoReload(): boolean {
  const lastReload = Number(sessionStorage.getItem(RELOAD_KEY) ?? "0");
  const now = Date.now();
  if (now - lastReload > RELOAD_COOLDOWN_MS) {
    sessionStorage.setItem(RELOAD_KEY, String(now));
    window.location.reload();
    return true;
  }
  return false;
}
