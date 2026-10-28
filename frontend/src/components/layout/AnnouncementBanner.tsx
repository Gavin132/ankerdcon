import { useState, type ElementType, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Info, Megaphone, X } from "lucide-react";
import { useActiveAnnouncements } from "../../hooks/useAnnouncements";
import { TripSheet } from "../trip/TripSheet";
import type { Announcement, AnnouncementSeverity } from "../../types";

const DISMISSED_KEY = "ankerd-dismissed-announcements";

function getDismissedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function persistDismissedIds(ids: Set<string>) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
  } catch {}
}

const SEVERITY_STYLE: Record<AnnouncementSeverity, { bg: string; icon: ElementType }> = {
  info:    { bg: "bg-slate-900 dark:bg-slate-800", icon: Info },
  warning: { bg: "bg-amber-500", icon: AlertTriangle },
  urgent:  { bg: "bg-rose-600",  icon: Megaphone },
};

/** Site-wide announcement bar(s), shown above the header on every page. `fallback` shows instead when there is
 * none (the "what's new" strip: one bar at a time keeps the top of a phone screen free). */
export function AnnouncementBanner({ fallback = null }: { fallback?: ReactNode }) {
  const { data: announcements } = useActiveAnnouncements();
  const [dismissed, setDismissed] = useState<Set<string>>(getDismissedIds);
  // The message stays while the sheet slides away, so it does not empty out on its way down.
  const [expanded, setExpanded] = useState<Announcement | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const visible = (announcements ?? []).filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return <>{fallback}</>;

  function dismiss(id: string) {
    setDismissed((prev) => {
      const next = new Set(prev).add(id);
      persistDismissedIds(next);
      return next;
    });
  }

  return (
    <div>
      <AnimatePresence initial={false}>
        {visible.map((announcement) => {
          const { bg, icon: Icon } = SEVERITY_STYLE[announcement.severity];
          return (
            <motion.div
              key={announcement.id}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className={`overflow-hidden text-white ${bg}`}
            >
              {/* Whole row opens the full message — a long one otherwise just
                  wraps the banner taller and taller with nothing to tap. */}
              <button
                type="button"
                onClick={() => { setExpanded(announcement); setSheetOpen(true); }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left hover:bg-black/10 transition-colors md:px-8 lg:px-10"
              >
                <Icon size={15} className="shrink-0" />
                <p className="min-w-0 flex-1 text-xs font-semibold leading-snug truncate">
                  {announcement.message}
                </p>
                {announcement.dismissible && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); dismiss(announcement.id); }}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); dismiss(announcement.id); } }}
                    aria-label="Sluiten"
                    className="hit-area -mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-white/20 transition-colors"
                  >
                    <X size={14} />
                  </span>
                )}
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>

      <TripSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Aankondiging">
        <p className="whitespace-pre-line text-sm leading-relaxed text-ink-2">{expanded?.message}</p>
      </TripSheet>
    </div>
  );
}
