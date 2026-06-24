import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Archive,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  UserMinus,
  Check,
  BedDouble,
  X,
} from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { Button } from "../common/Button";
import { NamePicker } from "../common/NamePicker";
import { parseEventDate, toDateKey, todayKey } from "../../utils/date";
import type { CalendarEvent } from "../../types";

interface CalendarArchiveProps {
  events: CalendarEvent[];
  allUsers?: string[];
  onRsvp?: (id: string, userName: string) => void;
  onLeave?: (id: string, userName: string) => void;
}

const DAYS_SHORT = ["zo", "ma", "di", "wo", "do", "vr", "za"];
const MONTHS_SHORT = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

export function CalendarArchive({
  events,
  allUsers = [],
  onRsvp,
  onLeave,
}: CalendarArchiveProps) {
  const PAGE_SIZE = 5;
  const [historyOpen, setHistoryOpen] = useState(false);
  const [upcomingPage, setUpcomingPage] = useState(0);
  const [activeRsvpEvent, setActiveRsvpEvent] = useState<string | null>(null);
  const [rsvpMode, setRsvpMode] = useState<"join" | "leave">("join");
  const [rsvpNames, setRsvpNames] = useState<string[]>([]);

  const today = todayKey();
  const hasRsvp = !!onRsvp && !!onLeave && allUsers.length > 0;

  // Flat list of all events with parsed dates, sorted chronologically
  const allEntries = events
    .map((ev) => ({ ev, date: parseEventDate(ev.date) }))
    .filter((x): x is { ev: CalendarEvent; date: Date } => x.date !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const upcomingEntries = allEntries.filter(({ date }) => toDateKey(date) >= today);
  const pastEntries = [...allEntries.filter(({ date }) => toDateKey(date) < today)].reverse();

  if (allEntries.length === 0) return null;

  function openRsvp(evId: string, mode: "join" | "leave") {
    setActiveRsvpEvent(evId);
    setRsvpMode(mode);
    setRsvpNames([]);
  }

  function closeRsvp() {
    setActiveRsvpEvent(null);
    setRsvpNames([]);
  }

  function renderRow(ev: CalendarEvent, date: Date, isPast: boolean) {
    const isRsvpOpen = activeRsvpEvent === ev.id;
    const dayLabel = DAYS_SHORT[date.getDay()];
    const dateNum = date.getDate();
    const monthLabel = MONTHS_SHORT[date.getMonth()];

    return (
      <div
        key={ev.id}
        className="border-b border-slate-50 last:border-b-0 dark:border-slate-800"
      >
        {/* Main row */}
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Date badge */}
          <div className="shrink-0 w-10 text-center">
            <p className={`text-[10px] font-bold uppercase ${isPast ? "text-slate-300 dark:text-slate-600" : "text-sky-500"}`}>
              {dayLabel}
            </p>
            <p className={`text-base font-black leading-none ${isPast ? "text-slate-300 dark:text-slate-600" : "text-slate-800 dark:text-white"}`}>
              {dateNum}
            </p>
            <p className={`text-[10px] font-medium ${isPast ? "text-slate-300 dark:text-slate-600" : "text-slate-400"}`}>
              {monthLabel}
            </p>
          </div>

          {/* Divider line */}
          <div className={`w-px self-stretch shrink-0 rounded-full ${isPast ? "bg-slate-100 dark:bg-slate-800" : "bg-sky-200 dark:bg-sky-900/50"}`} />

          {/* Event info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className={`text-sm font-bold truncate ${isPast ? "text-slate-400" : "text-slate-800 dark:text-white"}`}>
                {ev.event_name}
              </p>
              {ev.is_hotel && (
                <BedDouble size={11} className="shrink-0 text-violet-400" />
              )}
            </div>
            {ev.participants.length > 0 && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <div className="flex -space-x-1.5">
                  {ev.participants.slice(0, 5).map((p) => (
                    <UserAvatar key={p} name={p} className="h-5 w-5 text-[8px]" />
                  ))}
                </div>
                {ev.participants.length > 5 && (
                  <span className="text-[10px] font-bold text-slate-400">
                    +{ev.participants.length - 5}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* RSVP action buttons (future only) */}
          {hasRsvp && !isPast && !isRsvpOpen && (
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => openRsvp(ev.id, "join")}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors dark:bg-sky-900/25 dark:text-sky-400 dark:hover:bg-sky-900/40"
                title="Aanmelden"
              >
                <UserPlus size={13} />
              </button>
              {ev.participants.length > 0 && (
                <button
                  type="button"
                  onClick={() => openRsvp(ev.id, "leave")}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors dark:bg-slate-800/60 dark:hover:bg-slate-700"
                  title="Afmelden"
                >
                  <UserMinus size={13} />
                </button>
              )}
            </div>
          )}

          {/* Close button when RSVP is open */}
          {isRsvpOpen && (
            <button
              type="button"
              onClick={closeRsvp}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 transition-colors dark:hover:bg-slate-700"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Inline RSVP panel */}
        <AnimatePresence>
          {isRsvpOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-3 space-y-2 border-t border-slate-50 dark:border-slate-800 pt-2">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  {rsvpMode === "join" ? "Wie meldt zich aan?" : "Wie meldt zich af?"}
                </p>
                <NamePicker
                  multiple
                  options={rsvpMode === "leave" ? ev.participants : allUsers}
                  value={rsvpNames}
                  onChange={setRsvpNames}
                  color={rsvpMode === "leave" ? "rose" : "sky"}
                />
                <Button
                  size="sm"
                  variant={rsvpMode === "leave" ? "danger" : "primary"}
                  disabled={rsvpNames.length === 0}
                  className="w-full"
                  onClick={() => {
                    rsvpNames.forEach((name) => {
                      if (rsvpMode === "join") onRsvp!(ev.id, name);
                      else onLeave!(ev.id, name);
                    });
                    closeRsvp();
                  }}
                >
                  <Check size={13} />
                  {rsvpNames.length === 0
                    ? "Selecteer naam(en)"
                    : rsvpMode === "join"
                      ? `${rsvpNames.length} ${rsvpNames.length === 1 ? "persoon" : "personen"} aanmelden`
                      : `${rsvpNames.length} ${rsvpNames.length === 1 ? "persoon" : "personen"} afmelden`}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Upcoming ──────────────────────────────────────────────────────── */}
      {upcomingEntries.length > 0 && (() => {
        const totalPages = Math.ceil(upcomingEntries.length / PAGE_SIZE);
        const page = Math.min(upcomingPage, totalPages - 1);
        const pageItems = upcomingEntries.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

        return (
          <div>
            <div className="card-surface rounded-2xl overflow-hidden">
              {pageItems.map(({ ev, date }) => renderRow(ev, date, false))}

              {/* Paginator */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800 px-4 py-2.5">
                  <button
                    onClick={() => { setUpcomingPage((p) => Math.max(0, p - 1)); closeRsvp(); }}
                    disabled={page === 0}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed dark:hover:bg-slate-800"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => { setUpcomingPage(i); closeRsvp(); }}
                        className={`rounded-full transition-all ${
                          i === page
                            ? "h-2 w-5 bg-sky-500"
                            : "h-2 w-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600"
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => { setUpcomingPage((p) => Math.min(totalPages - 1, p + 1)); closeRsvp(); }}
                    disabled={page === totalPages - 1}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed dark:hover:bg-slate-800"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Past (collapsed) ──────────────────────────────────────────────── */}
      {pastEntries.length > 0 && (
        <div>
          <button
            onClick={() => setHistoryOpen((o) => !o)}
            className="flex w-full items-center justify-between mb-3 group"
          >
            <p className="section-label flex items-center gap-2">
              <Archive size={13} className="text-slate-400" />
              Geschiedenis ({pastEntries.length})
            </p>
            <motion.div
              animate={{ rotate: historyOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-slate-400 group-hover:text-slate-600 transition-colors"
            >
              <ChevronDown size={16} />
            </motion.div>
          </button>

          <AnimatePresence>
            {historyOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <div className="card-surface rounded-2xl overflow-hidden">
                  {pastEntries.map(({ ev, date }) => renderRow(ev, date, true))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}