import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import type { Blocker } from "react-router-dom";
import { Button } from "./Button";

interface Props {
  blocker: Blocker;
}

/** Confirm dialog shown by `useUnsavedChangesGuard` when navigation is blocked. */
export function UnsavedChangesModal({ blocker }: Props) {
  const open = blocker.state === "blocked";

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => blocker.state === "blocked" && blocker.reset()}
          />
          <motion.div
            className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-white/[0.08] shadow-2xl p-6"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-500/15 mb-4">
              <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              Niet-opgeslagen wijzigingen
            </h2>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Je hebt wijzigingen gemaakt die nog niet zijn opgeslagen. Weet je zeker dat je deze pagina wilt verlaten?
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => blocker.state === "blocked" && blocker.reset()}
              >
                Blijf op pagina
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => blocker.state === "blocked" && blocker.proceed()}
              >
                Verlaat pagina
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
