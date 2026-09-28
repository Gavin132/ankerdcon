import { useEffect } from "react";
import { motion } from "framer-motion";
import { APP_NAME } from "../../constants";
import type { SplashScreenProps } from "../../types/interfaces";

// It isn't waiting on anything real — the cached app shell is usually ready
// well before this — so it's kept just long enough to read as a brand
// moment, not a loading screen with nothing behind it.
const HOLD_MS = 1100;
const EXIT_DURATION = 0.45;

/**
 * Launch splash: a flat ink screen with the anchor logo and the app name in
 * the display face. Fades in, holds, then fades out when dismissed.
 */
export function SplashScreen({ onDismiss }: SplashScreenProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, HOLD_MS);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[#0F1519] px-6 select-none"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: EXIT_DURATION, ease: "easeInOut" }}
    >
      <motion.div
        className="flex flex-col items-center text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.35, ease: "easeOut" }}
      >
        <img
          src="/assets/images/ankerd-logo.webp"
          alt={APP_NAME}
          className="h-[96px] w-[96px] object-contain"
          draggable={false}
        />

        <motion.div
          className="mt-6 flex flex-col items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.35, ease: "easeOut" }}
        >
          <p className="font-display text-[52px] font-extrabold uppercase leading-[0.88] tracking-[0.01em] text-[#E6F0F3]">
            {APP_NAME}
          </p>
          <span aria-hidden className="h-[3px] w-10 rounded-full bg-brand" />
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#E6F0F3]/50">
            Live Event Logistics
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
