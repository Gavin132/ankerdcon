import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

const SEEN_KEY = "ankerd-seen-swipe-hint";
const AUTO_DISMISS_MS = 3500;

function hasSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // storage unavailable (private mode) — shows again next visit, harmless
  }
}

/**
 * A one-time nudge that swiping the event page moves between trips — shown
 * once ever, on the first trip page a device can actually swipe on (more
 * than one trip to go to), then never again. `dismissedBy` lets the page
 * cut it short the moment someone actually swipes for real: teaching a
 * gesture by getting in the way of using it would defeat the point.
 */
export function SwipeHint({ enabled, dismissedBy }: { enabled: boolean; dismissedBy: number }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!enabled || hasSeen()) return;
    setShow(true);
    markSeen();
    const t = window.setTimeout(() => setShow(false), AUTO_DISMISS_MS);
    return () => window.clearTimeout(t);
    // Only ever arms once, when a swipeable trip page is first reached.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // A real swipe already taught the lesson — cut the hint short instead of
  // lingering over the page it just demonstrated.
  useEffect(() => {
    if (dismissedBy > 0) setShow(false);
  }, [dismissedBy]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-4 pt-3" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))" }}>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 300 }}
            className="flex items-center gap-2 rounded-[12px] border-2 border-outline bg-surface px-3.5 py-2 text-ink shadow-xl"
          >
            <motion.span
              aria-hidden
              animate={{ x: [0, -3, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
              className="flex shrink-0 text-ink-3"
            >
              <ChevronLeft size={15} />
            </motion.span>
            <span className="text-[12.5px] font-semibold">Swipe voor andere evenementen</span>
            <motion.span
              aria-hidden
              animate={{ x: [0, 3, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
              className="flex shrink-0 text-ink-3"
            >
              <ChevronRight size={15} />
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
