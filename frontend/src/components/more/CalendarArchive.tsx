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
  Layers,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { UserAvatar } from "../common/UserAvatar";
import { Button } from "../common/Button";
import { NamePicker } from "../common/NamePicker";
import { parseEventDate, toDateKey, todayKey } from "../../utils/date";
import {
  groupCalendarEntries,
  getGroupTitle,
  formatDateRange,
  buildGroupColorMap,
  dayShort,
  monthShort,
  type GroupItem,
  type MultiDayColor,
} from "../../utils/multiDay";
import { routes } from "../../config/routes";
import type { CalendarEvent, User } from "../../types";

interface CalendarArchiveProps {
  events: CalendarEvent[];
  allUsers?: User[];
  onRsvp?: (id: string, userNames: string[]) => void;
  onLeave?: (id: string, userNames: string[]) => void;
}

interface RsvpTarget {
  kind: "single" | "group";
  eventIds: string[];
  allParticipants: string[];
  mode: "join" | "leave";
  groupId?: string;
}

const PAGE_SIZE = 5;

export function CalendarArchive({
  events,
  allUsers = [],
  onRsvp,
  onLeave,
}: CalendarArchiveProps) {
  const navigate = useNavigate();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [upcomingPage, setUpcomingPage] = useState(0);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [activeRsvp, setActiveRsvp] = useState<RsvpTarget | null>(null);
  const [rsvpNames, setRsvpNames] = useState<string[]>([]);

  const today = todayKey();
  const hasRsvp = !!onRsvp && !!onLeave && allUsers.length > 0;

  const groupColorMap = buildGroupColorMap(events);

  const allEntries = events
    .map((ev) => ({ ev, date: parseEventDate(ev.date) }))
    .filter((x): x is { ev: CalendarEvent; date: Date } => x.date !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (allEntries.length === 0) return null;

  const upcomingEntries = allEntries.filter(({ date }) => toDateKey(date) >= today);
  const pastEntries = allEntries.filter(({ date }) => toDateKey(date) < today);

  const upcomingItems = groupCalendarEntries(upcomingEntries);
  const pastItems = groupCalendarEntries(pastEntries).reverse();

  function toggleGroup(id: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function openRsvp(target: Omit<RsvpTarget, "mode">, mode: "join" | "leave") {
    setActiveRsvp({ ...target, mode });
    setRsvpNames([]);
  }

  function closeRsvp() {
    setActiveRsvp(null);
    setRsvpNames([]);
  }

  function confirmRsvp() {
    if (!activeRsvp) return;
    activeRsvp.eventIds.forEach((eventId) => {
      if (activeRsvp.mode === "join") onRsvp!(eventId, rsvpNames);
      else onLeave!(eventId, rsvpNames);
    });
    closeRsvp();
  }

  function resolvedName(p: string) {
    return allUsers.find((u) => u.name === p || u.discord_username === p || u.aliases?.includes(p));
  }

  // ── Inline RSVP panel (shared) ───────────────────────────────────────────

  function RsvpPanel({ target, indent = false }: { target: RsvpTarget; indent?: boolean }) {
    const isGroup = target.kind === "group";
    const label = target.mode === "join"
      ? isGroup ? "Wie meldt zich aan voor alle dagen?" : "Wie meldt zich aan?"
      : isGroup ? "Wie meldt zich af voor alle dagen?" : "Wie meldt zich af?";

    return (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="overflow-hidden"
      >
        <div className={`${indent ? "pl-6" : "px-4"} pr-4 pb-3 pt-2 space-y-2 border-t border-slate-50 dark:border-slate-800`}>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              {label}
            </p>
            <button
              type="button"
              onClick={closeRsvp}
              className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X size={11} />
            </button>
          </div>
          <NamePicker
            multiple
            options={target.mode === "leave" ? target.allParticipants : allUsers.map((u) => u.name)}
            value={rsvpNames}
            onChange={setRsvpNames}
            color={target.mode === "leave" ? "rose" : "sky"}
          />
          <Button
            size="sm"
            variant={target.mode === "leave" ? "danger" : "primary"}
            disabled={rsvpNames.length === 0}
            className="w-full"
            onClick={confirmRsvp}
          >
            <Check size={13} />
            {rsvpNames.length === 0
              ? "Selecteer naam(en)"
              : target.mode === "join"
                ? `${rsvpNames.length} ${rsvpNames.length === 1 ? "persoon" : "personen"} aanmelden${isGroup ? ` voor alle ${target.eventIds.length} dagen` : ""}`
                : `${rsvpNames.length} ${rsvpNames.length === 1 ? "persoon" : "personen"} afmelden${isGroup ? ` van alle ${target.eventIds.length} dagen` : ""}`}
          </Button>
        </div>
      </motion.div>
    );
  }

  // ── Single event row ─────────────────────────────────────────────────────

  function renderRow(ev: CalendarEvent, date: Date, isPast: boolean) {
    const isSingleRsvpOpen = activeRsvp?.kind === "single" && activeRsvp.eventIds[0] === ev.id;

    return (
      <div key={ev.id} className="border-b border-slate-50 last:border-b-0 dark:border-slate-800">
        <div
          onClick={() => { if (!isSingleRsvpOpen) navigate(routes.event.view(ev.id)); }}
          className={`flex items-center gap-3 px-4 py-3 transition-colors duration-150 ${!isSingleRsvpOpen ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.025]" : ""}`}
        >
          {/* Date badge */}
          <div className="shrink-0 w-10 text-center">
            <p className={`text-[10px] font-bold uppercase ${isPast ? "text-slate-300 dark:text-slate-600" : "text-sky-500"}`}>
              {dayShort(date)}
            </p>
            <p className={`text-base font-black leading-none ${isPast ? "text-slate-300 dark:text-slate-600" : "text-slate-800 dark:text-white"}`}>
              {date.getDate()}
            </p>
            <p className={`text-[10px] font-medium ${isPast ? "text-slate-300 dark:text-slate-600" : "text-slate-400"}`}>
              {monthShort(date)}
            </p>
          </div>

          <div className={`w-px self-stretch shrink-0 rounded-full ${isPast ? "bg-slate-100 dark:bg-slate-800" : "bg-sky-200 dark:bg-sky-900/50"}`} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className={`text-sm font-bold truncate ${isPast ? "text-slate-400" : "text-slate-800 dark:text-white"}`}>
                {ev.event_name}
              </p>
              {ev.is_hotel && <BedDouble size={11} className="shrink-0 text-violet-400" />}
            </div>
            {ev.participants.length > 0 && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <div className="flex -space-x-1.5">
                  {ev.participants.slice(0, 5).map((p) => (
                    <UserAvatar key={p} name={resolvedName(p)?.name ?? p} user={resolvedName(p)} className="h-5 w-5 text-[8px]" />
                  ))}
                </div>
                {ev.participants.length > 5 && (
                  <span className="text-[10px] font-bold text-slate-400">+{ev.participants.length - 5}</span>
                )}
              </div>
            )}
          </div>

          {hasRsvp && !isPast && !isSingleRsvpOpen && (
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); openRsvp({ kind: "single", eventIds: [ev.id], allParticipants: ev.participants }, "join"); }}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors dark:bg-sky-900/25 dark:text-sky-400 dark:hover:bg-sky-900/40"
                title="Aanmelden"
              >
                <UserPlus size={13} />
              </button>
              {ev.participants.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); openRsvp({ kind: "single", eventIds: [ev.id], allParticipants: ev.participants }, "leave"); }}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors dark:bg-slate-800/60 dark:hover:bg-slate-700"
                  title="Afmelden"
                >
                  <UserMinus size={13} />
                </button>
              )}
            </div>
          )}
        </div>

        <AnimatePresence>
          {isSingleRsvpOpen && <RsvpPanel target={activeRsvp!} />}
        </AnimatePresence>
      </div>
    );
  }

  // ── Day row inside a group block ─────────────────────────────────────────

  function renderGroupDayRow(ev: CalendarEvent, date: Date, isPast: boolean, color: MultiDayColor) {
    const isSingleRsvpOpen = activeRsvp?.kind === "single" && activeRsvp.eventIds[0] === ev.id;

    return (
      <div key={ev.id} className="border-b border-slate-50 last:border-b-0 dark:border-slate-800">
        <div
          onClick={() => { if (!isSingleRsvpOpen) navigate(routes.event.view(ev.id)); }}
          className={`flex items-center gap-3 pl-6 pr-4 py-2.5 transition-colors duration-150 ${!isSingleRsvpOpen ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.025]" : ""}`}
        >
          {/* Compact date badge */}
          <div className="shrink-0 w-8 text-center">
            <p className={`text-[9px] font-bold uppercase ${isPast ? "text-slate-300 dark:text-slate-600" : color.text}`}>
              {dayShort(date)}
            </p>
            <p className={`text-sm font-black leading-none ${isPast ? "text-slate-300 dark:text-slate-600" : "text-slate-700 dark:text-slate-200"}`}>
              {date.getDate()}
            </p>
            <p className={`text-[9px] font-medium ${isPast ? "text-slate-300 dark:text-slate-600" : "text-slate-400"}`}>
              {monthShort(date)}
            </p>
          </div>

          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold truncate ${isPast ? "text-slate-400 dark:text-slate-600" : "text-slate-700 dark:text-slate-300"}`}>
              {ev.event_name}
            </p>
            {ev.participants.length > 0 ? (
              <div className="mt-1 flex items-center gap-1.5">
                <div className="flex -space-x-1">
                  {ev.participants.slice(0, 4).map((p) => (
                    <UserAvatar key={p} name={resolvedName(p)?.name ?? p} user={resolvedName(p)} className="h-4 w-4 text-[7px]" />
                  ))}
                </div>
                <span className="text-[10px] text-slate-400 font-medium tabular-nums">
                  {ev.participants.length} aangemeld
                </span>
              </div>
            ) : (
              <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-0.5">Niemand aangemeld</p>
            )}
          </div>

          {hasRsvp && !isPast && !isSingleRsvpOpen && (
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); openRsvp({ kind: "single", eventIds: [ev.id], allParticipants: ev.participants }, "join"); }}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors dark:bg-sky-900/25 dark:text-sky-400 dark:hover:bg-sky-900/40"
                title="Aanmelden"
              >
                <UserPlus size={11} />
              </button>
              {ev.participants.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); openRsvp({ kind: "single", eventIds: [ev.id], allParticipants: ev.participants }, "leave"); }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors dark:bg-slate-800/60 dark:hover:bg-slate-700"
                  title="Afmelden"
                >
                  <UserMinus size={11} />
                </button>
              )}
            </div>
          )}
        </div>

        <AnimatePresence>
          {isSingleRsvpOpen && <RsvpPanel target={activeRsvp!} indent />}
        </AnimatePresence>
      </div>
    );
  }

  // ── Multi-day group block ────────────────────────────────────────────────

  function renderGroupBlock(item: GroupItem, isPast: boolean) {
    const color = groupColorMap.get(item.multiDayId) ?? { accent: "#38bdf8", bg: "bg-sky-500/10", text: "text-sky-400" } as MultiDayColor;
    const isExpanded = expandedGroups.has(item.multiDayId);
    const title = getGroupTitle(item.events);
    const dateRange = formatDateRange(item.events.map((e) => e.date));
    const firstDate = item.events[0].date;
    const lastDate = item.events[item.events.length - 1].date;
    const sameMonth = firstDate.getMonth() === lastDate.getMonth();
    const allParticipants = [...new Set(item.events.flatMap((e) => e.ev.participants))];
    const isBulkRsvpOpen = activeRsvp?.kind === "group" && activeRsvp.groupId === item.multiDayId;

    return (
      <div key={item.multiDayId} className="border-b border-slate-50 last:border-b-0 dark:border-slate-800">
        {/* Group header */}
        <button
          onClick={() => toggleGroup(item.multiDayId)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-white/[0.025] transition-colors duration-150"
          style={{ borderLeft: `3px solid ${isPast ? "#94a3b8" : color.accent}` }}
        >
          {/* Date badge — shows range e.g. "4–5 jul" */}
          <div className="shrink-0 w-10 text-center">
            <p className={`text-[10px] font-bold uppercase ${isPast ? "text-slate-300 dark:text-slate-600" : color.text}`}>
              {dayShort(firstDate)}
            </p>
            <p className={`${item.events.length > 1 ? "text-sm" : "text-base"} font-black leading-none ${isPast ? "text-slate-300 dark:text-slate-600" : "text-slate-800 dark:text-white"}`}>
              {item.events.length > 1
                ? `${firstDate.getDate()}–${lastDate.getDate()}`
                : firstDate.getDate()}
            </p>
            <p className={`text-[10px] font-medium ${isPast ? "text-slate-300 dark:text-slate-600" : "text-slate-400"}`}>
              {sameMonth
                ? monthShort(firstDate)
                : `${monthShort(firstDate)}–${monthShort(lastDate)}`}
            </p>
          </div>

          <div
            className="w-px self-stretch shrink-0 rounded-full"
            style={{ backgroundColor: isPast ? "#e2e8f0" : color.accent + "50" }}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Layers size={11} className="shrink-0" style={{ color: isPast ? "#94a3b8" : color.accent }} />
              <p className={`text-sm font-bold truncate ${isPast ? "text-slate-400" : "text-slate-800 dark:text-white"}`}>
                {title}
              </p>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-400 font-medium">
              {item.events.length} {item.events.length === 1 ? "dag" : "dagen"} · {dateRange}
            </p>
            {!isExpanded && allParticipants.length > 0 && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <div className="flex -space-x-1.5">
                  {allParticipants.slice(0, 5).map((p) => (
                    <UserAvatar key={p} name={resolvedName(p)?.name ?? p} user={resolvedName(p)} className="h-4 w-4 text-[7px]" />
                  ))}
                </div>
                {allParticipants.length > 5 && (
                  <span className="text-[10px] font-bold text-slate-400">+{allParticipants.length - 5}</span>
                )}
              </div>
            )}
          </div>

          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 text-slate-400"
          >
            <ChevronDown size={14} />
          </motion.div>
        </button>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div
                className="border-t border-slate-50 dark:border-slate-800"
                style={{ borderLeft: `3px solid ${isPast ? "#e2e8f066" : color.accent + "33"}` }}
              >
                {/* Per-day rows */}
                {item.events.map(({ ev, date }) => renderGroupDayRow(ev, date, isPast, color))}

                {/* Bulk RSVP */}
                {hasRsvp && !isPast && (
                  <div className="pl-6 pr-4 py-2.5 border-t border-slate-50 dark:border-slate-800">
                    <AnimatePresence mode="wait">
                      {isBulkRsvpOpen ? (
                        <RsvpPanel key="bulk-panel" target={activeRsvp!} indent />
                      ) : (
                        <motion.div
                          key="bulk-buttons"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2"
                        >
                          <button
                            type="button"
                            onClick={() => openRsvp({
                              kind: "group",
                              eventIds: item.events.map((e) => e.ev.id),
                              allParticipants,
                              groupId: item.multiDayId,
                            }, "join")}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-1.5 text-[11px] font-semibold transition-colors"
                            style={{
                              borderColor: color.accent + "50",
                              backgroundColor: color.accent + "12",
                              color: color.accent,
                            }}
                          >
                            <UserPlus size={11} />
                            Alle dagen aanmelden
                          </button>
                          {allParticipants.length > 0 && (
                            <button
                              type="button"
                              onClick={() => openRsvp({
                                kind: "group",
                                eventIds: item.events.map((e) => e.ev.id),
                                allParticipants,
                                groupId: item.multiDayId,
                              }, "leave")}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 py-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <UserMinus size={11} />
                              Afmelden van alle
                            </button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Layout ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Upcoming */}
      {upcomingItems.length > 0 && (() => {
        const totalPages = Math.ceil(upcomingItems.length / PAGE_SIZE);
        const page = Math.min(upcomingPage, Math.max(0, totalPages - 1));
        const pageItems = upcomingItems.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

        return (
          <div className="card-surface rounded-2xl overflow-hidden">
            {pageItems.map((item) =>
              item.type === "single"
                ? renderRow(item.ev, item.date, false)
                : renderGroupBlock(item, false),
            )}

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
                      className={`rounded-full transition-all ${i === page ? "h-2 w-5 bg-sky-500" : "h-2 w-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600"}`}
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
        );
      })()}

      {/* Past */}
      {pastItems.length > 0 && (
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
                  {pastItems.map((item) =>
                    item.type === "single"
                      ? renderRow(item.ev, item.date, true)
                      : renderGroupBlock(item, true),
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
