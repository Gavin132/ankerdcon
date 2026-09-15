import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useToastStore } from "../../store/toast.store";

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return createPortal(
    <div className="fixed left-1/2 z-[300] flex -translate-x-1/2 flex-col items-center gap-2 pointer-events-none w-full max-w-sm px-4 bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] md:bottom-6">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            className={`pointer-events-auto flex w-full items-center gap-3 rounded-xl border-1.5 bg-surface px-3 py-2.5 shadow-xl ${
              t.type === "error" ? "border-rose-500" : "border-outline"
            }`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg overflow-hidden ${
                t.type === "success"
                  ? "bg-brand"
                  : t.type === "error"
                  ? "bg-rose-600"
                  : "bg-slate-600"
              }`}
            >
              <img
                src="/assets/images/ankerd-logo.png"
                alt=""
                className="h-5 w-5 object-contain"
                style={{ filter: t.type === "success" ? "brightness(0)" : "brightness(0) invert(1)" }}
              />
            </div>
            <p className="flex-1 text-sm font-medium text-ink leading-tight">
              {t.message}
            </p>
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 flex h-6 w-6 items-center justify-center rounded-md text-ink-3 hover:text-ink hover:bg-sunken transition-colors"
            >
              <X size={13} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
