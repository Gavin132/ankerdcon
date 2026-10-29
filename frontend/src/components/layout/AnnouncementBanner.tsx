import { useState, type ElementType, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ChevronRight, Info, Megaphone, X } from "lucide-react";
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

// Info is a quiet strip (the loudest element on every page should not be a notice); warning is amber with dark
// text (white on amber was 2.1:1); urgent keeps rose with white text.
const SEVERITY_STYLE: Record<AnnouncementSeverity, { bar: string; hover: string; icon: ElementType }> = {
  info:    { bar: "border-b-1.5 border-line bg-sunken text-ink", hover: "hover:bg-ink/5", icon: Info },
  warning: { bar: "bg-warn-fill text-warn-on", hover: "hover:bg-scrim/10", icon: AlertTriangle },
  urgent:  { bar: "bg-bad-fill text-bad-on", hover: "hover:bg-scrim/10", icon: Megaphone },
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
        {visible.map((announcement, index) => {
          const { bar, hover, icon: Icon } = SEVERITY_STYLE[announcement.severity];
          return (
            <motion.div
              key={announcement.id}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className={`overflow-hidden ${bar}`}
            >
              {/* On a phone with a notch (installed app) the first bar starts under it. */}
              {index === 0 && <div style={{ height: "env(safe-area-inset-top, 0px)" }} />}
              <div className="flex items-center gap-1 px-4 md:px-8 lg:px-10">
                {/* Opens the full message: a long one is cut off after two lines. The close button is a sibling,
                    not inside this one (a button in a button is not valid and breaks keyboard and screen readers). */}
                <button
                  type="button"
                  onClick={() => { setExpanded(announcement); setSheetOpen(true); }}
                  className={`flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-md py-2 text-left transition-colors ${hover}`}
                >
                  <Icon size={16} className="shrink-0" />
                  <p className="line-clamp-2 min-w-0 flex-1 text-xs font-semibold leading-snug">
                    {announcement.message}
                  </p>
                  <ChevronRight size={16} className="shrink-0 opacity-70" />
                </button>
                {announcement.dismissible && (
                  <button
                    type="button"
                    onClick={() => dismiss(announcement.id)}
                    aria-label="Sluiten"
                    className={`hit-area -mr-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors ${hover}`}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
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
