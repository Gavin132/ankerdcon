/**
 * Deliberately throws on render, to exercise `ErrorBoundary` end to end —
 * its auto-reload-once behavior and, if the crash recurs right after that
 * reload, the "Er ging iets mis" fallback screen. Not linked from anywhere
 * in the UI; visit the route directly to trigger it.
 */
export function CrashTestPage(): never {
  throw new Error("CrashTestPage: intentional test crash");
}
