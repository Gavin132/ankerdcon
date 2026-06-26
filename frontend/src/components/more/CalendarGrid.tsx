import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  BedDouble,
  UserPlus,
  UserMinus,
  Check,
  Info,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "../common/Badge";
import { Button } from "../common/Button";
import { NamePicker } from "../common/NamePicker";
import { UserAvatar } from "../common/UserAvatar";
import { parseEventDate, toDateKey, todayKey } from "../../utils/date";
import { routes } from "../../config/routes";
import type { CalendarEvent, User } from "../../types";
import { DAY_LABELS } from "../../constants";

interface CalendarGridProps {
  events: CalendarEvent[];
  allUsers?: User[];
  onRsvp?: (id: string, userName: string) => void;
  onLeave?: (id: string, userName: string) => void;
}

export function CalendarGrid({
  events,
  allUsers = [],
  onRsvp,
  onLeave,
}: CalendarGridProps) {
  const navigate = useNavigate();
  const [activeRsvpEvent, setActiveRsvpEvent] = useState<string | null>(null);
  const [rsvpMode, setRsvpMode] = useState<"join" | "leave">("join");
  const [rsvpNames, setRsvpNames] = useState<string[]>([]);

  const eventMap = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      const d = parseEventDate(ev.date);
      if (!d) continue;
      const key = toDateKey(d);
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }, [events]);

  const [currentMonth, setCurrentMonth] = useState<{
    year: number;
    month: number;
  }>(() => {
    const today = new Date();
    const keys = Object.keys(eventMap).sort();
    const futureKey = keys.find((k) => k >= toDateKey(today));
    if (futureKey) {
      const d = new Date(futureKey + "T00:00:00");
      return { year: d.getFullYear(), month: d.getMonth() };
    }
    return { year: today.getFullYear(), month: today.getMonth() };
  });

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { year, month } = currentMonth;
  const monthLabel = new Date(year, month, 1).toLocaleDateString("nl-NL", {
    month: "long",
    year: "numeric",
  });

  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const today = todayKey();
  const selectedEvents = selectedDate ? (eventMap[selectedDate] ?? []) : [];

  const monthEventCount = Object.entries(eventMap)
    .filter(([key]) => {
      const d = new Date(key + "T00:00:00");
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .reduce((acc, [, evs]) => acc + evs.length, 0);

  function prevMonth() {
    setCurrentMonth(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 },
    );
    setSelectedDate(null);
  }

  function nextMonth() {
    setCurrentMonth(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 },
    );
    setSelectedDate(null);
  }

  return (
    <div className="card-surface rounded-2xl overflow-hidden">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-50 dark:border-slate-800">
        <button
          onClick={prevMonth}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:bg-slate-100 transition-colors dark:hover:bg-slate-700"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <p className="text-sm font-black text-slate-800 dark:text-white capitalize">
            {monthLabel}
          </p>
          {monthEventCount > 0 && (
            <p className="text-xs text-sky-500 font-semibold mt-0.5">
              {monthEventCount} {monthEventCount === 1 ? "event" : "events"}
            </p>
          )}
        </div>
        <button
          onClick={nextMonth}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:bg-slate-100 transition-colors dark:hover:bg-slate-700"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="px-3 py-3">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_LABELS.map((d) => (
            <div
              key={d}
              className="text-center text-xs font-bold text-slate-300 py-1"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, i) => {
            if (day === null) return <div key={i} className="h-10" />;
            const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const hasEvents = !!eventMap[dateKey]?.length;
            const isSelected = selectedDate === dateKey;
            const isToday = today === dateKey;
            const eventCount = eventMap[dateKey]?.length ?? 0;

            return (
              <button
                key={i}
                onClick={() =>
                  hasEvents && setSelectedDate(isSelected ? null : dateKey)
                }
                disabled={!hasEvents}
                className={[
                  "relative flex h-10 flex-col items-center justify-center rounded-xl text-sm transition-all",
                  isSelected
                    ? "bg-sky-500 text-white shadow-sm font-black"
                    : "",
                  !isSelected && hasEvents
                    ? "text-sky-700 font-black hover:bg-sky-50 cursor-pointer dark:text-sky-400 dark:hover:bg-sky-900/30"
                    : "",
                  !isSelected && !hasEvents
                    ? "text-slate-300 font-medium cursor-default"
                    : "",
                  isToday && !isSelected
                    ? "ring-2 ring-sky-400 ring-offset-1"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="leading-none">{day}</span>
                {hasEvents && !isSelected && (
                  <span className="mt-0.5 flex gap-0.5">
                    {Array.from({ length: Math.min(eventCount, 3) }).map(
                      (_, j) => (
                        <span
                          key={j}
                          className="h-1 w-1 rounded-full bg-sky-400"
                        />
                      ),
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected day events */}
        <AnimatePresence>
          {selectedDate && selectedEvents.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-2.5 border-t border-slate-100 pt-3 dark:border-slate-700">
                {selectedEvents.map((ev) => {
                  const isPast = selectedDate !== null && selectedDate < today;
                  const isRsvpOpen = activeRsvpEvent === ev.id;
                  const hasRsvp = !!onRsvp && !!onLeave && (allUsers ?? []).length > 0;

                  return (
                    <div
                      key={ev.id}
                      className="rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-3 dark:border-sky-900/50 dark:from-sky-900/20 dark:to-slate-800/50"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg gradient-brand">
                          <CalendarDays size={14} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-black text-slate-900 dark:text-white text-sm leading-tight">
                              {ev.event_name}
                            </p>
                            {ev.is_hotel && (
                              <Badge variant="violet">
                                <BedDouble size={10} />
                                Hotel
                              </Badge>
                            )}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); navigate(routes.event.view(ev.id)); }}
                              className="flex items-center gap-1 rounded-lg bg-sky-50 dark:bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-colors"
                            >
                              <Info size={10} />
                              Details
                            </button>
                          </div>

                          {/* Avatar Facepile */}
                          {ev.participants.length > 0 && (
                            <div className="mt-2.5 flex items-center -space-x-2">
                              {ev.participants.map((p) => {
                                const resolved = allUsers?.find((u) => u.name === p || u.discord_username === p || u.aliases?.includes(p));
                                return (
                                  <UserAvatar
                                    key={p}
                                    name={resolved?.name ?? p}
                                    user={resolved}
                                    className="h-7 w-7 text-[10px] ring-2 ring-white dark:ring-slate-800"
                                  />
                                );
                              })}
                            </div>
                          )}

                          {/* RSVP actions */}
                          {hasRsvp && !isPast && (
                            <div className="mt-3 border-t border-sky-100/60 pt-3 dark:border-sky-800/30">
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
                                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors dark:hover:bg-slate-700"
                                    >
                                      <span className="text-xs">✕</span>
                                    </button>
                                  </div>
                                  <NamePicker
                                    multiple
                                    options={
                                      rsvpMode === "leave"
                                        ? ev.participants
                                        : (allUsers ?? []).map((u) => u.name)
                                    }
                                    value={rsvpNames}
                                    onChange={setRsvpNames}
                                    color={
                                      rsvpMode === "leave" ? "rose" : "sky"
                                    }
                                  />
                                  <Button
                                    size="sm"
                                    variant={
                                      rsvpMode === "leave"
                                        ? "danger"
                                        : "primary"
                                    }
                                    disabled={rsvpNames.length === 0}
                                    className="w-full"
                                    onClick={() => {
                                      rsvpNames.forEach((name) => {
                                        if (rsvpMode === "join")
                                          onRsvp!(ev.id, name);
                                        else onLeave!(ev.id, name);
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
                                      setActiveRsvpEvent(ev.id);
                                      setRsvpMode("join");
                                      setRsvpNames([]);
                                    }}
                                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-sky-200/60 bg-sky-50 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition-colors dark:border-sky-800/50 dark:bg-sky-900/25 dark:text-sky-400 dark:hover:bg-sky-900/40"
                                  >
                                    <UserPlus size={12} />
                                    Aanmelden
                                  </button>
                                  {ev.participants.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveRsvpEvent(ev.id);
                                        setRsvpMode("leave");
                                        setRsvpNames([]);
                                      }}
                                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200/60 bg-slate-50 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400 dark:hover:bg-slate-800"
                                    >
                                      <UserMinus size={12} />
                                      Afmelden
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}