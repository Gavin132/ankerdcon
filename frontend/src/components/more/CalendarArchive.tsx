import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Archive,
  ChevronDown,
  CalendarDays,
  UserPlus,
  UserMinus,
  Check,
  BedDouble,
} from "lucide-react";
import { Badge } from "../common/Badge";
import { Button } from "../common/Button";
import { NamePicker } from "../common/NamePicker";
import { avatarColor, personInitial } from "../../utils/avatar";
import { parseEventDate, toDateKey, todayKey } from "../../utils/date";
import type { CalendarEvent } from "../../types";

interface CalendarArchiveProps {
  events: CalendarEvent[];
  allUsers?: string[];
  onRsvp?: (rowNumber: number, userName: string) => void;
  onLeave?: (rowNumber: number, userName: string) => void;
}

function formatEventId(id: string): string {
  return id
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-zA-Z])/g, "$1 $2")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

interface EventGroup {
  id: string;
  displayName: string;
  entries: { ev: CalendarEvent; date: Date }[];
  firstDate: Date;
  lastDate: Date;
  isPast: boolean;
}

export function CalendarArchive({
  events,
  allUsers = [],
  onRsvp,
  onLeave,
}: CalendarArchiveProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [activeRsvpEvent, setActiveRsvpEvent] = useState<number | null>(null);
  const [rsvpMode, setRsvpMode] = useState<"join" | "leave">("join");
  const [rsvpNames, setRsvpNames] = useState<string[]>([]);

  const today = todayKey();
  const hasRsvp = !!onRsvp && !!onLeave && allUsers.length > 0;

  // Group events by event_id
  const groupMap = new Map<string, EventGroup>();
  for (const ev of events) {
    const date = parseEventDate(ev.date);
    if (!date) continue;
    if (!groupMap.has(ev.event_id)) {
      groupMap.set(ev.event_id, {
        id: ev.event_id,
        displayName: formatEventId(ev.event_id),
        entries: [],
        firstDate: date,
        lastDate: date,
        isPast: false,
      });
    }
    const group = groupMap.get(ev.event_id)!;
    group.entries.push({ ev, date });
    if (date < group.firstDate) group.firstDate = date;
    if (date > group.lastDate) group.lastDate = date;
  }

  // Sort entries within each group chronologically and determine if group is past
  for (const group of groupMap.values()) {
    group.entries.sort((a, b) => a.date.getTime() - b.date.getTime());
    group.isPast = toDateKey(group.lastDate) < today;
  }

  const allGroups = Array.from(groupMap.values());
  // Upcoming: sorted chronologically (earliest first)
  const upcomingGroups = allGroups
    .filter((g) => !g.isPast)
    .sort((a, b) => a.firstDate.getTime() - b.firstDate.getTime());
  // Past: most recent first
  const pastGroups = allGroups
    .filter((g) => g.isPast)
    .sort((a, b) => b.firstDate.getTime() - a.firstDate.getTime());

  if (allGroups.length === 0) return null;

  function toggleGroup(id: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function renderGroup(group: EventGroup) {
    const isExpanded = expandedGroups.has(group.id);

    return (
      <div key={group.id} className="card-surface rounded-2xl overflow-hidden">
        <button
          onClick={() => toggleGroup(group.id)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 active:bg-slate-50 transition-colors dark:hover:bg-slate-800/60 dark:active:bg-slate-800/60"
        >
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              group.isPast ? "bg-slate-100 dark:bg-slate-700" : "gradient-brand"
            }`}
          >
            <CalendarDays
              size={14}
              className={group.isPast ? "text-slate-400" : "text-white"}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-bold truncate ${
                group.isPast
                  ? "text-slate-400"
                  : "text-slate-800 dark:text-white"
              }`}
            >
              {group.displayName}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {group.entries.length}{" "}
              {group.entries.length === 1 ? "dag" : "dagen"}
            </p>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-slate-400"
          >
            <ChevronDown size={14} />
          </motion.div>
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="border-t border-slate-50 dark:border-slate-800 divide-y divide-slate-50 dark:divide-slate-800">
                {group.entries.map(({ ev, date }) => {
                  const dateKey = toDateKey(date);
                  const isEventPast = dateKey < today;
                  const isRsvpOpen = activeRsvpEvent === ev.row_number;

                  return (
                    <div key={ev.row_number} className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p
                          className={`text-sm font-semibold ${
                            isEventPast
                              ? "text-slate-400"
                              : "text-slate-800 dark:text-white"
                          }`}
                        >
                          {ev.event_name}
                        </p>
                        {ev.is_hotel && (
                          <Badge variant="violet">
                            <BedDouble size={10} />
                            Hotel
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{ev.date}</p>

                      {ev.participants.length > 0 && (
                        <div className="mt-2 flex -space-x-1.5">
                          {ev.participants.slice(0, 6).map((p) => (
                            <div
                              key={p}
                              title={p}
                              className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br text-white ${avatarColor(p)}`}
                              style={{ fontSize: "9px", fontWeight: 900 }}
                            >
                              {personInitial(p)}
                            </div>
                          ))}
                          {ev.participants.length > 6 && (
                            <div
                              className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-slate-600"
                              style={{ fontSize: "9px", fontWeight: 700 }}
                            >
                              +{ev.participants.length - 6}
                            </div>
                          )}
                        </div>
                      )}

                      {/* RSVP — only for future days */}
                      {hasRsvp && !isEventPast && (
                        <div className="mt-2.5">
                          {isRsvpOpen ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                  {rsvpMode === "join"
                                    ? "Wie meldt zich aan?"
                                    : "Wie meldt zich af?"}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveRsvpEvent(null);
                                    setRsvpNames([]);
                                  }}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors dark:hover:bg-slate-700"
                                >
                                  <span className="text-xs">✕</span>
                                </button>
                              </div>
                              <NamePicker
                                multiple
                                options={
                                  rsvpMode === "leave"
                                    ? ev.participants
                                    : allUsers
                                }
                                value={rsvpNames}
                                onChange={setRsvpNames}
                                color={rsvpMode === "leave" ? "rose" : "sky"}
                              />
                              <Button
                                size="sm"
                                variant={
                                  rsvpMode === "leave" ? "danger" : "primary"
                                }
                                disabled={rsvpNames.length === 0}
                                className="w-full"
                                onClick={() => {
                                  rsvpNames.forEach((name) => {
                                    if (rsvpMode === "join")
                                      onRsvp!(ev.row_number, name);
                                    else onLeave!(ev.row_number, name);
                                  });
                                  setActiveRsvpEvent(null);
                                  setRsvpNames([]);
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
                          ) : (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveRsvpEvent(ev.row_number);
                                  setRsvpMode("join");
                                  setRsvpNames([]);
                                }}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-sky-200/60 bg-sky-50 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition-colors dark:border-sky-800/50 dark:bg-sky-900/25 dark:text-sky-400 dark:hover:bg-sky-900/40"
                              >
                                <UserPlus size={11} />
                                Aanmelden
                              </button>
                              {ev.participants.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveRsvpEvent(ev.row_number);
                                    setRsvpMode("leave");
                                    setRsvpNames([]);
                                  }}
                                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200/60 bg-slate-50 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400 dark:hover:bg-slate-800"
                                >
                                  <UserMinus size={11} />
                                  Afmelden
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upcoming event groups */}
      {upcomingGroups.length > 0 && (
        <div>
          <p className="section-label mb-3 flex items-center gap-2">
            <CalendarDays size={13} className="text-sky-500" />
            Aankomende evenementen
          </p>
          <div className="space-y-2">
            {upcomingGroups.map(renderGroup)}
          </div>
        </div>
      )}

      {/* Past event groups — collapsed under history */}
      {pastGroups.length > 0 && (
        <div>
          <button
            onClick={() => setHistoryOpen((o) => !o)}
            className="flex w-full items-center justify-between mb-3 group"
          >
            <p className="section-label flex items-center gap-2">
              <Archive size={13} className="text-slate-400" />
              Geschiedenis (
              {pastGroups.length}{" "}
              {pastGroups.length === 1 ? "evenement" : "evenementen"})
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
                <div className="space-y-2">
                  {pastGroups.map(renderGroup)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
