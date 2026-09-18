import { useEffect, useState } from "react";

/**
 * Registers the service worker (production builds only — in dev it would serve
 * stale modules and fight Vite's HMR) and reports when a new version has
 * finished downloading and is waiting to take over.
 */
export function useServiceWorker(): { updateReady: boolean; applyUpdate: () => void } {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

    let cancelled = false;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        if (cancelled) return;

        // A worker can already be waiting from a previous visit.
        if (reg.waiting && navigator.serviceWorker.controller) setUpdateReady(true);

        reg.addEventListener("updatefound", () => {
          const incoming = reg.installing;
          if (!incoming) return;
          incoming.addEventListener("statechange", () => {
            // The worker skips waiting and activates on its own, so "installed"
            // and "activated" both mean the new build is in place; this page is
            // still running the old one until it reloads. `controller` is null
            // on a first install — that's this same build, not an update.
            if (
              (incoming.state === "installed" || incoming.state === "activated") &&
              navigator.serviceWorker.controller
            ) {
              setUpdateReady(true);
            }
          });
        });

        // Coming back to the app is the natural moment to look for a release.
        const checkOnFocus = () => {
          if (!document.hidden) reg.update().catch(() => {});
        };
        document.addEventListener("visibilitychange", checkOnFocus);
        return () => document.removeEventListener("visibilitychange", checkOnFocus);
      })
      .catch(() => {
        // No worker: the app works exactly as it did before, just without the
        // offline shell. Nothing to tell the user about.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function applyUpdate() {
    // The new worker is already in charge, so a plain reload fetches the new
    // index.html through it and the new bundle with it.
    window.location.reload();
  }

  return { updateReady, applyUpdate };
}
