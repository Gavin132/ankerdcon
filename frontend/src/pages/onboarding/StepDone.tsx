import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";

export function StepDone() {
  return (
    <div className="flex flex-col items-center text-center gap-6 py-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-outline bg-brand text-brand-on"
      >
        <Check size={36} strokeWidth={3} />
      </motion.div>

      <div className="space-y-2">
        <h1 className="font-display text-[38px] font-extrabold uppercase leading-[0.95] tracking-[0.01em] text-ink">
          Je bent er klaar voor!
        </h1>
        <p className="mx-auto max-w-xs text-sm leading-relaxed text-ink-2">
          Welkom aan boord. We hopen dat de app goed van pas komt — geniet van het evenement!
        </p>
      </div>

      <div className="card-surface w-full p-4 text-left">
        <div className="flex items-center gap-3">
          <Sparkles size={15} className="shrink-0 text-ink-3" />
          <p className="text-xs leading-relaxed text-ink-2">
            Je kunt je profiel en voorkeuren altijd aanpassen via de <strong className="text-ink">Meer</strong> pagina.
          </p>
        </div>
      </div>
    </div>
  );
}
