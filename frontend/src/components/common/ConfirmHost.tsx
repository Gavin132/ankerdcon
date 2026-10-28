import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useConfirmStore } from "../../store/confirm.store";
import { useBackClose } from "../../hooks/useBackClose";
import { Button } from "./Button";

/** Shows the question `askConfirm()` was called with. Mounted once, in App. */
export function ConfirmHost() {
  const request = useConfirmStore((s) => s.request);
  const answer = useConfirmStore((s) => s.answer);
  // Going back answers "no".
  useBackClose(!!request, () => answer(false));

  return createPortal(
    <AnimatePresence>
      {request && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-slate-950/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => answer(false)}
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-label={request.title}
            className="relative w-full max-w-sm rounded-2xl bg-surface border-2 border-outline p-6"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
          >
            <div className={`mb-4 h-10 w-10 ${request.destructive ? "icon-tile-bad" : "icon-tile-warn"}`}>
              <AlertTriangle size={20} />
            </div>
            <h2 className="font-display text-2xl font-extrabold uppercase leading-none text-ink">{request.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">{request.message}</p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => answer(false)}>
                {request.cancelLabel}
              </Button>
              <Button size="sm" variant={request.destructive ? "danger" : "primary"} onClick={() => answer(true)}>
                {request.confirmLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
