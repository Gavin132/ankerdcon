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
    <AnimatePresence>
      {updateReady && (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 300 }}
          className="pointer-events-none fixed inset-x-0 bottom-0 z-[120] flex justify-center px-4"
          style={{ paddingBottom: "max(5.5rem, calc(env(safe-area-inset-bottom, 0px) + 5.5rem))" }}
          role="status"
        >
          <div className="pointer-events-auto flex items-center gap-3 rounded-[12px] border-2 border-outline bg-surface px-3.5 py-2.5">
            <span className="text-[13px] font-semibold text-ink">Nieuwe versie beschikbaar</span>
            <button type="button" onClick={applyUpdate} className="btn-primary h-8 px-3 text-xs">
              <RefreshCw size={13} />
              Herladen
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
