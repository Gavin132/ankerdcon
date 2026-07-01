import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";

export function StepDone() {
  return (
    <div className="flex flex-col items-center text-center gap-6 py-4">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
        className="relative flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", bounce: 0.6 }}
        >
          <Check size={40} strokeWidth={3} className="text-white" />
        </motion.div>
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-emerald-400"
          initial={{ scale: 1, opacity: 0.8 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
        />
      </motion.div>

      <div className="space-y-2">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Je bent er klaar voor!
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
          Welkom aan boord. We hopen dat de app goed van pas komt — geniet van het evenement!
        </p>
      </div>

      <div className="w-full rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4 text-left">
        <div className="flex items-center gap-3">
          <Sparkles size={15} className="text-sky-500 shrink-0" />
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Je kunt je profiel en voorkeuren altijd aanpassen via de <strong className="text-slate-700 dark:text-slate-300">Meer</strong> pagina.
          </p>
        </div>
      </div>
    </div>
  );
}
