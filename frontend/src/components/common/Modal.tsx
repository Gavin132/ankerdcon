import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, description, children }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
            <motion.div
              className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 overflow-hidden flex flex-col max-h-[90vh]"
              style={{ boxShadow: "0 24px 64px rgba(12,42,62,0.20)" }}
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              {/* Header */}
              <div className="flex shrink-0 items-start justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-slate-100">{title}</h2>
                  {description && (
                    <p className="mt-0.5 text-sm text-slate-400">{description}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="ml-3 mt-0.5 rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              {/* Scrollable content */}
              <div className="overflow-y-auto px-6 py-5">{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
