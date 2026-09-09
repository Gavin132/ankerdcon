import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { useChangelog } from "../../hooks/useChangelog";
import { routes } from "../../config/routes";

const SEEN_KEY = "ankerd-changelog-last-seen";

function getLastSeenId(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

function markSeen(id: string) {
  try {
    localStorage.setItem(SEEN_KEY, id);
  } catch {}
}

/** Dismissible "what's new" bar for the single most recent changelog entry.
 * Reappears automatically whenever a newer entry gets published, regardless
 * of whether an older one was dismissed. */
export function ChangelogBanner() {
  const { data: entries } = useChangelog();
  const latest = entries?.[0];
  const [dismissed, setDismissed] = useState(false);

  if (!latest || dismissed || getLastSeenId() === latest.id) return null;

  function dismiss() {
    markSeen(latest!.id);
    setDismissed(true);
  }

  return (
    <AnimatePresence initial={false}>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="overflow-hidden text-white bg-violet-600"
      >
        {/* The whole row is the tap target (not just an inline "bekijk alles"
            link) — a long title otherwise pushes that link off past the edge
            of the screen on mobile, making it uncloseable/unclickable. */}
        <Link
          to={routes.changelog}
          onClick={dismiss}
          className="mx-auto flex max-w-2xl items-center gap-2.5 px-5 py-2.5 hover:bg-white/10 transition-colors"
        >
          <Sparkles size={15} className="shrink-0" />
          <p className="min-w-0 flex-1 text-xs font-semibold leading-snug truncate">
            Nieuw: {latest.title}
          </p>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); dismiss(); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); dismiss(); } }}
            aria-label="Sluiten"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg hover:bg-white/20 transition-colors"
          >
            <X size={14} />
          </span>
        </Link>
      </motion.div>
    </AnimatePresence>
  );
}
