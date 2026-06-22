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

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
}: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — only visible on sm+ where the modal doesn't cover the full screen */}
          <motion.div
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm sm:block"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* On mobile: fullscreen slide-up. On sm+: centered dialog. */}
          <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:p-4">
            <motion.div
              className="
                w-full flex flex-col
                bg-white dark:bg-slate-900
                /* Mobile: fullscreen, no border radius */
                h-[100dvh] rounded-none
                /* sm+: auto height, centered card with rounded corners */
                sm:h-auto sm:max-h-[90dvh] sm:rounded-3xl sm:max-w-md sm:mx-auto
              "
              style={{
                boxShadow: "0 -8px 40px rgba(12,42,62,0.18), 0 2px 8px rgba(0,0,0,0.06)",
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
            >
              {/* Header — includes top safe area padding on mobile */}
              <div
                className="flex shrink-0 items-start justify-between px-6 pb-4 pt-6 border-b border-slate-100 dark:border-slate-800"
                style={{ paddingTop: "max(1.5rem, env(safe-area-inset-top, 0px))" }}
              >
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-slate-100">
                    {title}
                  </h2>
                  {description && (
                    <p className="mt-0.5 text-sm text-slate-400">{description}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="ml-3 mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable content */}
              <div
                className="flex-1 overflow-y-auto overscroll-contain px-6 py-5"
                style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))" }}
              >
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
