import { useState, useMemo, useEffect } from "react";
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
  Layers,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "../common/Badge";
import { Button } from "../common/Button";
import { NamePicker } from "../common/NamePicker";
import { UserAvatar } from "../common/UserAvatar";
import { parseEventDate, toDateKey, todayKey } from "../../utils/date";
import { buildGroupColorMap } from "../../utils/multiDay";
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
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-700/60">
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
                  "relative flex h-11 flex-col items-center justify-center text-sm transition-all select-none",
                  hasEvents ? "cursor-pointer" : "cursor-default",
                  // Hover for non-group single-event days
                  !isSelected && hasEvents && !isInGroup ? "rounded-xl hover:bg-sky-50 dark:hover:bg-sky-900/20" : "",
                  // Hover for group days
                  !isSelected && isInGroup ? "hover:brightness-95 dark:hover:brightness-110" : "",
                ].filter(Boolean).join(" ")}
              >
                {/* ── Multi-day group background span ── */}
                {!isSelected && primaryBand && (
                  <div
                    className="absolute inset-y-1 pointer-events-none z-0"
                    style={{
                      left: primaryBand.isStart ? "20%" : 0,
                      right: primaryBand.isEnd ? "20%" : 0,
                      backgroundColor: primaryBand.accent + "2a",
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
                  <div className="absolute inset-y-1 left-[12%] right-[12%] bg-sky-500 rounded-full shadow-sm pointer-events-none z-0" />
                )}

                {/* ── Today ring ── */}
                {isToday && !isSelected && (
                  <div
                    className="absolute inset-y-1 left-[12%] right-[12%] rounded-full pointer-events-none z-0"
                    style={{ boxShadow: "0 0 0 2px #38bdf8" }}
                  />
                )}

                {/* ── Day number ── */}
                <span
                  className={[
                    "relative z-10 leading-none",
                    isSelected ? "font-black text-white" : "",
                    !isSelected && isInGroup ? "font-black" : "",
                    !isSelected && !isInGroup && hasEvents ? "font-black text-sky-700 dark:text-sky-400" : "",
                    !isSelected && !hasEvents ? "font-medium text-slate-300 dark:text-slate-600" : "",
                  ].filter(Boolean).join(" ")}
                  style={!isSelected && primaryBand ? { color: primaryBand.accent } : undefined}
                >
                  {day}
                </span>

                {/* ── Dot for single (non-group) events ── */}
                {hasEvents && !isSelected && !isInGroup && (
                  <span className="mt-0.5 h-1 w-1 rounded-full bg-sky-400 z-10" />
                )}

                {/* ── Extra band dot when day has 2+ groups ── */}
                {!isSelected && (dayBands[dateKey]?.length ?? 0) > 1 && (
                  <span
                    className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full z-10"
                    style={{ backgroundColor: dayBands[dateKey][1].accent }}
                  />
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
              <div className="mt-3 space-y-2.5 border-t border-slate-100 dark:border-slate-700/60 pt-3">
                {selectedEvents.map((ev) => {
                  const isPast = selectedDate !== null && selectedDate < today;
                  const isRsvpOpen = activeRsvpEvent === ev.id;
                  const hasRsvp = !!onRsvp && !!onLeave && (allUsers ?? []).length > 0;
                  const evColor = ev.multi_day_id ? groupColorMap.get(ev.multi_day_id) : null;

                  return (
                    <div
                      key={ev.id}
                      className="rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700/60 bg-slate-50 dark:bg-black/20"
                    >
                      {/* Accent line */}
                      <div
                        className="h-[3px]"
                        style={{
                          background: evColor
                            ? `linear-gradient(to right, ${evColor.accent}, ${evColor.accent}80)`
                            : "linear-gradient(to right, #38bdf8, #818cf8)",
                        }}
                      />
                      <div className="p-3">
                      <div className="flex items-start gap-2.5">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                          style={evColor
                            ? { backgroundColor: evColor.accent + "22" }
                            : { background: "linear-gradient(135deg,#38bdf8,#818cf8)" }}
                        >
                          {evColor
                            ? <Layers size={14} style={{ color: evColor.accent }} />
                            : <CalendarDays size={14} className="text-white" />}
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
                                    className="h-7 w-7 text-[10px] ring-2 ring-white dark:ring-[#1e293b]"
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
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p>
                                    <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
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
                              <div className="mt-3 border-t border-sky-100/60 pt-3 dark:border-sky-800/30">
                                {isRsvpOpen ? (
                                  <RsvpPanel
                                    mode={rsvpMode}
                                    label={rsvpMode === "join" ? "Wie meldt zich aan?" : "Wie meldt zich af?"}
                                    leaveOptions={ev.participants}
                                    onClose={() => { setActiveRsvpEvent(null); setRsvpNames([]); }}
                                    onConfirm={() => {
                                      rsvpNames.forEach((name) => {
                                        if (rsvpMode === "join") onRsvp!(ev.id, name);
                                        else onLeave!(ev.id, name);
                                      });
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
                                      rsvpNames.forEach((name) => {
                                        groupIds.forEach((eid) => {
                                          if (groupRsvpMode === "join") onRsvp!(eid, name);
                                          else onLeave!(eid, name);
                                        });
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
                                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-sky-200/60 bg-sky-50 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition-colors dark:border-sky-800/50 dark:bg-sky-900/25 dark:text-sky-400 dark:hover:bg-sky-900/40"
                                      >
                                        <UserPlus size={12} />
                                        {isMultiDay ? "Deze dag" : "Aanmelden"}
                                      </button>
                                      {ev.participants.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => { setActiveRsvpEvent(ev.id); setRsvpMode("leave"); setRsvpNames([]); setGroupRsvpId(null); }}
                                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200/60 bg-slate-50 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400 dark:hover:bg-slate-800"
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
                                        className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-colors"
                                        style={{ border: `1px solid ${evColor?.accent ?? "#38bdf8"}40`, backgroundColor: `${evColor?.accent ?? "#38bdf8"}12`, color: evColor?.accent ?? "#38bdf8" }}
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