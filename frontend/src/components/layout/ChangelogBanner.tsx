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
        className="overflow-hidden border-b border-line bg-brand-soft text-brand-text"
      >
        {/* The whole row is the tap target (not just an inline "bekijk alles"
            link) — a long title otherwise pushes that link off past the edge
            of the screen on mobile, making it uncloseable/unclickable. */}
        <Link
          to={routes.changelog}
          onClick={dismiss}
          className="flex items-center gap-2.5 px-4 py-2 hover:bg-brand/10 transition-colors md:px-8 lg:px-10"
        >
          <Sparkles size={16} className="shrink-0" />
          <p className="min-w-0 flex-1 text-xs font-semibold leading-snug truncate">
            Nieuw: {latest.title}
          </p>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); dismiss(); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); dismiss(); } }}
            aria-label="Sluiten"
            className="hit-area -mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-brand/15 transition-colors"
          >
            <X size={16} />
          </span>
        </Link>
      </motion.div>
    </AnimatePresence>
  );
}
