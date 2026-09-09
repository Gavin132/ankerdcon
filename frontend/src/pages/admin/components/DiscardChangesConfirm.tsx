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
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onCancel}
          />
          <motion.div
            className="relative w-full max-w-xs rounded-2xl bg-[#0c1220] border border-white/[0.08] shadow-2xl p-5"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 mb-3">
              <AlertTriangle size={18} className="text-amber-400" />
            </div>
            <h3 className="text-sm font-black text-white">Niet-opgeslagen wijzigingen</h3>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Weet je zeker dat je dit paneel wilt sluiten zonder op te slaan?
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.06] transition-colors"
              >
                Blijf hier
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="rounded-xl bg-gradient-to-r from-rose-500 to-red-500 px-3.5 py-2 text-xs font-bold text-white hover:opacity-90 transition-opacity"
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
