import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { useServiceWorker } from "../../hooks/useServiceWorker";

/**
 * A new version is cached and ready. It's applied on a reload, which we leave
 * to the user: reloading on its own would throw away whatever they were in the
 * middle of typing.
 */
export function UpdateBanner() {
  const { updateReady, applyUpdate } = useServiceWorker();

  return (
    <AnimatePresence initial={false}>
      {updateReady && (
        // A strip at the top, in the flow like the other banners (offline, viewer): nothing floats over the tab bar.
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="sticky top-0 z-[100] overflow-hidden border-b-1.5 border-line bg-brand-soft text-brand-text"
          role="status"
        >
          <div style={{ height: "env(safe-area-inset-top, 0px)" }} />
          <div className="flex items-center justify-between gap-3 px-4 py-1.5 md:px-8 lg:px-10">
            <span className="text-sm font-semibold">Nieuwe versie beschikbaar</span>
            <button type="button" onClick={applyUpdate} className="btn-primary px-3.5">
              <RefreshCw size={16} />
              Herladen
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
