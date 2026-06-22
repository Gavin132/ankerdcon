import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { usePullToRefresh } from "../../hooks/usePullToRefresh";

const THRESHOLD  = 68;
const HEADER_H   = 56; // matches AppShell header height (px)

export function PullToRefresh() {
  const queryClient = useQueryClient();

  const { pullDistance, isRefreshing } = usePullToRefresh(async () => {
    await queryClient.invalidateQueries();
  });

  const progress   = Math.min(pullDistance / THRESHOLD, 1);
  const visible    = pullDistance > 4 || isRefreshing;

  // Slides in from above the header bottom edge as the user pulls.
  // At pullDistance=0  → indicatorY = –44 (hidden above)
  // At pullDistance=68 → indicatorY = +10 (settled below header)
  const indicatorY = isRefreshing
    ? 10
    : progress * 54 - 44;

  return (
    <div
      style={{
        position: "fixed",
        top: `calc(env(safe-area-inset-top, 0px) + ${HEADER_H}px)`,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        zIndex: 29,
        pointerEvents: "none",
        transform: `translateY(${indicatorY}px)`,
        opacity: visible ? 1 : 0,
        // During pull: no transition so it tracks the finger exactly.
        // On release: spring back.
        transition: pullDistance > 0
          ? "opacity 0.08s"
          : "transform 0.38s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s",
      }}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
        <motion.div
          animate={{ rotate: isRefreshing ? 360 : progress * 270 }}
          transition={
            isRefreshing
              ? { duration: 0.65, repeat: Infinity, ease: "linear" }
              : { duration: 0 }
          }
        >
          <RefreshCw
            size={15}
            className={`transition-colors duration-150 ${
              progress >= 1 || isRefreshing ? "text-sky-500" : "text-slate-400"
            }`}
          />
        </motion.div>
      </div>
    </div>
  );
}
