import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Collapse } from "./Collapse";
import { ChemistryJoke } from "./ChemistryJoke";
import { StatusLink } from "./StatusLink";

interface StatusScreenProps {
  /** A small label above the title ("Fout 404"). */
  kicker?: string;
  /** The logo, or an icon in a coloured square: one of the two, never both. */
  mark: "logo" | { icon: ReactNode; tone: "bad" | "warn" };
  title: string;
  /** What happened and what to do. */
  children: ReactNode;
  /** The buttons, straight under the text: the way out comes before anything else. */
  actions: ReactNode;
  /** The technical message and the feedback form: behind "Technische details", so most people never meet them. */
  details?: ReactNode;
  /** The link to the public status page (for screens that may be our fault or their reception). */
  statusLink?: boolean;
  /** Above every other layer (the "Nieuwe versie" banner, toasts): the crash screen, whose buttons nothing may cover. */
  topmost?: boolean;
}

/**
 * The screens that replace the app when it cannot be shown (404, no access, server unreachable, a crash), built
 * once: mark, title, text, buttons, then the chemistry joke and, behind a disclosure, the technical details.
 */
export function StatusScreen({ kicker, mark, title, children, actions, details, statusLink, topmost }: StatusScreenProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  return (
    <div
      className={`fixed inset-0 ${topmost ? "z-[500]" : "z-50"} flex flex-col items-center overflow-y-auto bg-paper px-6 py-12 select-none`}
    >
      <motion.div
        className="my-auto flex w-full max-w-sm flex-col items-center text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {mark === "logo" ? (
          <img src="/assets/images/ankerd-logo.webp" alt="" className="h-16 w-16 object-contain" draggable={false} />
        ) : (
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${mark.tone === "bad" ? "pill-bad" : "pill-warn"}`}>
            {mark.icon}
          </div>
        )}

        {kicker && <p className="label-quiet mt-5">{kicker}</p>}
        <h1 className={`${kicker ? "mt-1" : "mt-5"} font-display text-[42px] font-extrabold uppercase leading-[0.95] text-ink`}>{title}</h1>
        <div className="mt-3 max-w-[320px] space-y-2 text-sm leading-relaxed text-ink-2">{children}</div>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">{actions}</div>

        <ChemistryJoke className="mt-8" />

        {details && (
          <div className="mt-4 flex w-full flex-col items-center">
            <button
              type="button"
              onClick={() => setDetailsOpen((v) => !v)}
              aria-expanded={detailsOpen}
              className="inline-flex min-h-11 items-center gap-1.5 text-[12.5px] font-semibold text-ink-2 hover:text-ink"
            >
              Technische details
              <ChevronDown size={14} className={`transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
            </button>
            <Collapse open={detailsOpen} className="w-full">
              <div className="flex flex-col items-center pb-2">{details}</div>
            </Collapse>
          </div>
        )}

        {statusLink && <StatusLink className="mt-2" />}
      </motion.div>
    </div>
  );
}
