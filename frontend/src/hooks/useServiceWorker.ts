import { useEffect, useState } from "react";

/**
 * Registers the service worker (production builds only — in dev it would serve
 * stale modules and fight Vite's HMR) and reports when a new version has
 * finished downloading and is waiting to take over.
 */
export function useServiceWorker(): { updateReady: boolean; applyUpdate: () => void } {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

    let cancelled = false;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        if (cancelled) return;

        // A worker can already be waiting from a previous visit.
        if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);

        reg.addEventListener("updatefound", () => {
          const incoming = reg.installing;
          if (!incoming) return;
          incoming.addEventListener("statechange", () => {
            // `controller` is null on the very first install — that's this same
            // version arriving, not an update to announce.
            if (incoming.state === "installed" && navigator.serviceWorker.controller) setWaiting(incoming);
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
    if (!waiting) return;
    // The new worker takes over, which fires `controllerchange`; reloading
    // there (rather than immediately) guarantees the new bundle is what loads.
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
    waiting.postMessage("SKIP_WAITING");
  }

  return { updateReady: waiting !== null, applyUpdate };
}
