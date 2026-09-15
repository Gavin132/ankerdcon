import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AdminDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200]">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-slate-950/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Panel — portalled to body, so no stacking context can clip it */}
          <motion.div
            className="absolute inset-y-0 right-0 flex w-full flex-col overflow-hidden border-l-1.5 border-line bg-surface text-ink shadow-xl sm:w-[480px]"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b-1.5 border-line px-6 py-5">
              <div className="min-w-0">
                <h2 className="font-display text-2xl font-extrabold uppercase leading-none tracking-[0.01em] text-ink">
                  {title}
                </h2>
                {subtitle && (
                  <p className="mt-1 text-xs text-ink-3">{subtitle}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

            {/* Sticky footer */}
            {footer && (
              <div className="shrink-0 border-t-1.5 border-line bg-paper px-6 py-4">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
