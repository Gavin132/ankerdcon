import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useToastStore } from "../../store/toast.store";

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2 pointer-events-none w-full max-w-sm px-4">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className={`pointer-events-auto flex w-full items-center gap-3 rounded-2xl bg-white/95 backdrop-blur-sm dark:bg-slate-800/95 px-4 py-3 shadow-xl border ${
              t.type === "success"
                ? "border-sky-100 dark:border-sky-800/60"
                : t.type === "error"
                ? "border-rose-100 dark:border-rose-800/60"
                : "border-slate-100 dark:border-slate-700"
            }`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl overflow-hidden ${
                t.type === "success"
                  ? "gradient-brand"
                  : t.type === "error"
                  ? "bg-gradient-to-br from-rose-400 to-rose-600"
                  : "bg-gradient-to-br from-slate-400 to-slate-500"
              }`}
            >
              <img
                src="/assets/images/ankerd-logo.png"
                alt=""
                className="h-5 w-5 object-contain"
                style={{ filter: "brightness(0) invert(1)" }}
              />
            </div>
            <p className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
              {t.message}
            </p>
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors dark:hover:text-slate-200 dark:hover:bg-slate-700"
            >
              <X size={13} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
