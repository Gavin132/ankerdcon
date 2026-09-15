import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  BedDouble,
  Utensils,
  UserPlus,
  UserMinus,
  Check,
  Info,
  Layers,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../common/Button";
import { NamePicker } from "../common/NamePicker";
import { UserAvatar } from "../common/UserAvatar";
import { parseEventDate, toDateKey, todayKey } from "../../utils/date";
import { buildGroupColorMap } from "../../utils/multiDay";
import { useTimeStore, getNow } from "../../store/time.store";
import { routes } from "../../config/routes";
import type { CalendarEvent, Meal, User } from "../../types";
import { DAY_LABELS } from "../../constants";

const TAG = "inline-flex items-center gap-1 rounded-md border border-line px-1.5 font-mono text-[10.5px] uppercase leading-[18px] tracking-[0.05em] text-ink-2";

interface CalendarGridProps {
  events: CalendarEvent[];
  meals?: Meal[];
  allUsers?: User[];
  onRsvp?: (id: string, userNames: string[]) => void;
  onLeave?: (id: string, userNames: string[]) => void;
}

export function CalendarGrid({
  events,
  meals = [],
  allUsers = [],
  onRsvp,
  onLeave,
}: CalendarGridProps) {
  const navigate = useNavigate();
  useTimeStore((s) => s.override); // re-render when the time-travel override changes
  const [activeRsvpEvent, setActiveRsvpEvent] = useState<string | null>(null);
  const [rsvpMode, setRsvpMode] = useState<"join" | "leave">("join");
  const [rsvpNames, setRsvpNames] = useState<string[]>([]);
  const [groupRsvpId, setGroupRsvpId] = useState<string | null>(null);
  const [groupRsvpMode, setGroupRsvpMode] = useState<"join" | "leave">("join");

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

  // Group bands: which days have a multi-day span and their position (start/mid/end)
  const { dayBands, groupEventIds, groupAllParticipants, groupColorMap } = useMemo(() => {
    // Build collision-free color map from all events (not just visible month)
    const colorMap = buildGroupColorMap(events);

    const spans: Record<string, { dates: string[]; accent: string }> = {};
    for (const [dateKey, evs] of Object.entries(eventMap)) {
      for (const ev of evs) {
        if (!ev.multi_day_id) continue;
        if (!spans[ev.multi_day_id]) {
          const accent = colorMap.get(ev.multi_day_id)?.accent ?? "#38bdf8";
          spans[ev.multi_day_id] = { dates: [], accent };
        }
        if (!spans[ev.multi_day_id].dates.includes(dateKey)) {
          spans[ev.multi_day_id].dates.push(dateKey);
        }
      }
    }
    for (const s of Object.values(spans)) s.dates.sort();

    const bands: Record<string, { accent: string; isStart: boolean; isEnd: boolean }[]> = {};
    for (const [, span] of Object.entries(spans)) {
      for (let i = 0; i < span.dates.length; i++) {
        const dk = span.dates[i];
        if (!bands[dk]) bands[dk] = [];
        bands[dk].push({ accent: span.accent, isStart: i === 0, isEnd: i === span.dates.length - 1 });
      }
    }

    const evIds: Record<string, string[]> = {};
    const evParts: Record<string, string[]> = {};
    for (const ev of events) {
      if (!ev.multi_day_id) continue;
      if (!evIds[ev.multi_day_id]) evIds[ev.multi_day_id] = [];
      if (!evParts[ev.multi_day_id]) evParts[ev.multi_day_id] = [];
      evIds[ev.multi_day_id].push(ev.id);
      for (const p of ev.participants) {
        if (!evParts[ev.multi_day_id].includes(p)) evParts[ev.multi_day_id].push(p);
      }
    }

    return { dayBands: bands, groupEventIds: evIds, groupAllParticipants: evParts, groupColorMap: colorMap };
  }, [eventMap, events]);

  const [currentMonth, setCurrentMonth] = useState<{
    year: number;
    month: number;
  }>(() => {
    const today = getNow();
    const keys = Object.keys(eventMap).sort();
    const futureKey = keys.find((k) => k >= toDateKey(today));
    if (futureKey) {
      const d = new Date(futureKey + "T00:00:00");
      return { year: d.getFullYear(), month: d.getMonth() };
    }
    return { year: today.getFullYear(), month: today.getMonth() };
  });

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Reset RSVP panels when selected date changes
  useEffect(() => {
    setActiveRsvpEvent(null);
    setGroupRsvpId(null);
    setRsvpNames([]);
  }, [selectedDate]);

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

  function hasMeal(eventId: string) {
    return meals.some((m) => m.linked_event_id === eventId);
  }

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
    <div className="card-surface overflow-hidden">
      {/* Month navigation */}
      <div className="flex items-center justify-between border-b-1.5 border-line px-3 py-2.5">
        <button
          onClick={prevMonth}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="font-display text-[24px] font-extrabold uppercase leading-none text-ink">
            {monthLabel}
          </p>
          {monthEventCount > 0 && (
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
              {monthEventCount} {monthEventCount === 1 ? "event" : "events"}
            </p>
          )}
        </div>
        <button
          onClick={nextMonth}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="px-3 py-3 sm:px-4">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_LABELS.map((d) => (
            <div
              key={d}
              className="py-1 text-center font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-ink-3"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-0">
          {cells.map((day, i) => {
            if (day === null) return <div key={i} className="h-11" />;
            const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const hasEvents = !!eventMap[dateKey]?.length;
            const isSelected = selectedDate === dateKey;
            const isToday = today === dateKey;
            const primaryBand = dayBands[dateKey]?.[0];
            const isInGroup = !!primaryBand;

            return (
              <button
                key={i}
                onClick={() => hasEvents && setSelectedDate(isSelected ? null : dateKey)}
                disabled={!hasEvents}
                className={[
                  "relative flex h-11 flex-col items-center justify-center font-mono text-sm tabular-nums transition-colors select-none sm:h-12",
                  hasEvents ? "cursor-pointer" : "cursor-default",
                  // Hover for non-group single-event days
                  !isSelected && hasEvents && !isInGroup ? "rounded-lg hover:bg-sunken" : "",
                ].filter(Boolean).join(" ")}
              >
                {/* ── Multi-day group background span ── */}
                {!isSelected && primaryBand && (
                  <div
                    className="pointer-events-none absolute inset-y-1 z-0 bg-brand-soft"
                    style={{
                      left: primaryBand.isStart ? "12%" : 0,
                      right: primaryBand.isEnd ? "12%" : 0,
                      borderRadius:
                        primaryBand.isStart && primaryBand.isEnd ? "9999px"
                        : primaryBand.isStart ? "9999px 0 0 9999px"
                        : primaryBand.isEnd ? "0 9999px 9999px 0"
                        : 0,
                    }}
                  />
                )}

                {/* ── Selected state circle ── */}
                {isSelected && (
                  <div className="pointer-events-none absolute inset-y-1 left-[12%] right-[12%] z-0 rounded-full bg-ink dark:bg-brand" />
                )}

                {/* ── Today ring ── */}
                {isToday && !isSelected && (
                  <div className="pointer-events-none absolute inset-y-1 left-[12%] right-[12%] z-0 rounded-full border-2 border-outline" />
                )}

                {/* ── Day number ── */}
                <span
                  className={[
                    "relative z-10 leading-none",
                    isSelected ? "font-bold text-paper dark:text-brand-on" : "",
                    !isSelected && hasEvents ? "font-bold text-ink" : "",
                    !isSelected && !hasEvents ? (isToday ? "font-semibold text-ink" : "font-normal text-ink-3") : "",
                  ].filter(Boolean).join(" ")}
                >
                  {day}
                </span>

                {/* ── Dot for single (non-group) events ── */}
                {hasEvents && !isSelected && !isInGroup && (
                  <span className="z-10 mt-1 h-1 w-1 rounded-full bg-ink" />
                )}

                {/* ── Extra band dot when day has 2+ groups ── */}
                {!isSelected && (dayBands[dateKey]?.length ?? 0) > 1 && (
                  <span className="absolute bottom-1 right-1 z-10 h-1.5 w-1.5 rounded-full bg-ink-3" />
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
              <div className="mt-3 space-y-2.5 border-t-1.5 border-line pt-3">
                {selectedEvents.map((ev) => {
                  const isPast = selectedDate !== null && selectedDate < today;
                  const isRsvpOpen = activeRsvpEvent === ev.id;
                  const hasRsvp = !!onRsvp && !!onLeave && (allUsers ?? []).length > 0;
                  const evColor = ev.multi_day_id ? groupColorMap.get(ev.multi_day_id) : null;

                  return (
                    <div
                      key={ev.id}
                      className="rounded-xl border-1.5 border-line bg-surface"
                    >
                      <div className="p-3">
                      <div className="flex items-start gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
                          {evColor
                            ? <Layers size={15} />
                            : <CalendarDays size={15} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="mr-0.5 text-[14px] font-semibold leading-tight text-ink">
                              {ev.event_name}
                            </p>
                            {ev.is_hotel && (
                              <span className={TAG}>
                                <BedDouble size={10} />
                                Hotel
                              </span>
                            )}
                            {ev.has_con === false && (
                              <span className={TAG}>
                                <BedDouble size={10} />
                                Reisdag
                              </span>
                            )}
                            {hasMeal(ev.id) && (
                              <span className={TAG} title="Etentje gepland">
                                <Utensils size={10} />
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); navigate(routes.event.view(ev.id)); }}
                              className="ml-auto flex items-center gap-1 text-[12.5px] font-semibold text-brand-text hover:underline"
                            >
                              <Info size={12} />
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
                                    className="h-7 w-7 text-[10px] ring-2 ring-surface"
                                  />
                                );
                              })}
                            </div>
                          )}

                          {/* RSVP actions */}
                          {hasRsvp && !isPast && (() => {
                            const isGroupRsvpOpen = ev.multi_day_id !== null && ev.multi_day_id !== undefined && groupRsvpId === ev.multi_day_id;
                            const groupIds = ev.multi_day_id ? (groupEventIds[ev.multi_day_id] ?? []) : [];
                            const groupParts = ev.multi_day_id ? (groupAllParticipants[ev.multi_day_id] ?? []) : [];
                            const isMultiDay = groupIds.length > 1;

                            // Shared name picker panel
                            function RsvpPanel({ mode, label, onConfirm, onClose, leaveOptions }: {
                              mode: "join" | "leave"; label: string;
                              onConfirm: () => void; onClose: () => void;
                              leaveOptions: string[];
                            }) {
                              return (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <p className="section-label">{label}</p>
                                    <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-sunken hover:text-ink">
                                      <X size={12} />
                                    </button>
                                  </div>
                                  <NamePicker
                                    multiple
                                    options={mode === "leave" ? leaveOptions : (allUsers ?? []).map((u) => u.name)}
                                    value={rsvpNames}
                                    onChange={setRsvpNames}
                                    color={mode === "leave" ? "rose" : "sky"}
                                  />
                                  <Button size="sm" variant={mode === "leave" ? "danger" : "primary"} disabled={rsvpNames.length === 0} className="w-full" onClick={onConfirm}>
                                    <Check size={13} />
                                    {rsvpNames.length === 0 ? "Selecteer naam(en)"
                                      : mode === "join" ? `${rsvpNames.length} aanmelden` : `${rsvpNames.length} afmelden`}
                                  </Button>
                                </div>
                              );
                            }

                            return (
                              <div className="mt-3 border-t border-line pt-3">
                                {isRsvpOpen ? (
                                  <RsvpPanel
                                    mode={rsvpMode}
                                    label={rsvpMode === "join" ? "Wie meldt zich aan?" : "Wie meldt zich af?"}
                                    leaveOptions={ev.participants}
                                    onClose={() => { setActiveRsvpEvent(null); setRsvpNames([]); }}
                                    onConfirm={() => {
                                      if (rsvpMode === "join") onRsvp!(ev.id, rsvpNames);
                                      else onLeave!(ev.id, rsvpNames);
                                      setActiveRsvpEvent(null);
                                      setRsvpNames([]);
                                    }}
                                  />
                                ) : isGroupRsvpOpen ? (
                                  <RsvpPanel
                                    mode={groupRsvpMode}
                                    label={groupRsvpMode === "join" ? `Wie meldt zich aan voor alle ${groupIds.length} dagen?` : `Wie meldt zich af voor alle ${groupIds.length} dagen?`}
                                    leaveOptions={groupParts}
                                    onClose={() => { setGroupRsvpId(null); setRsvpNames([]); }}
                                    onConfirm={() => {
                                      groupIds.forEach((eid) => {
                                        if (groupRsvpMode === "join") onRsvp!(eid, rsvpNames);
                                        else onLeave!(eid, rsvpNames);
                                      });
                                      setGroupRsvpId(null);
                                      setRsvpNames([]);
                                    }}
                                  />
                                ) : (
                                  <div className="space-y-1.5">
                                    {/* Per-day RSVP */}
                                    <div className="flex gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => { setActiveRsvpEvent(ev.id); setRsvpMode("join"); setRsvpNames([]); setGroupRsvpId(null); }}
                                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-1.5 border-line bg-surface py-2 text-[12.5px] font-semibold text-ink transition-colors hover:border-ink-3"
                                      >
                                        <UserPlus size={12} />
                                        {isMultiDay ? "Deze dag" : "Aanmelden"}
                                      </button>
                                      {ev.participants.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => { setActiveRsvpEvent(ev.id); setRsvpMode("leave"); setRsvpNames([]); setGroupRsvpId(null); }}
                                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-1.5 border-line bg-surface py-2 text-[12.5px] font-semibold text-ink-2 transition-colors hover:border-ink-3 hover:text-ink"
                                        >
                                          <UserMinus size={12} />
                                          Afmelden
                                        </button>
                                      )}
                                    </div>
                                    {/* Group RSVP (only for multi-day events) */}
                                    {isMultiDay && (
                                      <button
                                        type="button"
                                        onClick={() => { setGroupRsvpId(ev.multi_day_id!); setGroupRsvpMode("join"); setRsvpNames([]); setActiveRsvpEvent(null); }}
                                        className="flex w-full items-center justify-center gap-1.5 rounded-xl border-1.5 border-line bg-surface py-2 text-[12.5px] font-semibold text-ink transition-colors hover:border-ink-3"
                                      >
                                        <Layers size={11} />
                                        Alle {groupIds.length} dagen aanmelden
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      </div>{/* /p-3 */}
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