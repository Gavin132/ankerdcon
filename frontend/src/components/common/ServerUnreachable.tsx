import { motion } from "framer-motion";
import { WifiOff } from "lucide-react";
import { StatusLink } from "./StatusLink";

/**
 * Shown when the signed-in user's profile can't be loaded (backend down, a 5xx,
 * no reception). The app isn't rendered underneath: its own current-user
 * queries would refetch on mount, flip the query back to loading, unmount the
 * app again and loop forever.
 */
export function ServerUnreachable({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-paper px-6 py-12 text-center">
      <motion.div
        className="flex max-w-sm flex-col items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
          <WifiOff size={24} />
        </div>
        <h1 className="mt-4 font-display text-[36px] font-extrabold uppercase leading-[0.95] text-ink">
          Kan de server niet bereiken
        </h1>
        <p className="mt-3 max-w-[300px] text-sm leading-relaxed text-ink-2">
          Controleer je verbinding of probeer het zo nog eens.
        </p>
        <button type="button" onClick={onRetry} className="btn-primary mt-6 px-4 py-2.5 text-sm">
          Opnieuw proberen
        </button>
        <StatusLink className="mt-6" />
      </motion.div>
    </div>
  );
}
