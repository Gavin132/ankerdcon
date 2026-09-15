import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Confirm dialog shown by `useConfirmDiscard` when an admin drawer is
 * closed (X, Escape, backdrop, or the footer's Cancel button) while dirty.
 * Sits above the drawer's own z-[200] stacking. */
export function DiscardChangesConfirm({ open, onCancel, onConfirm }: Props) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-slate-950/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onCancel}
          />
          <motion.div
            className="relative w-full max-w-xs rounded-2xl border-1.5 border-line bg-surface p-5 shadow-xl"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
              <AlertTriangle size={18} />
            </div>
            <h3 className="text-sm font-semibold text-ink">Niet-opgeslagen wijzigingen</h3>
            <p className="mt-1 text-xs leading-relaxed text-ink-2">
              Weet je zeker dat je dit paneel wilt sluiten zonder op te slaan?
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl border-1.5 border-line bg-surface px-3.5 py-2 text-xs font-semibold text-ink transition-colors hover:border-ink-3"
              >
                Blijf hier
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="rounded-xl border-2 border-rose-800 bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-700 dark:border-rose-400"
              >
                Sluiten
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
