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
  Utensils,
  X,
  Layers,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../common/Button";
import { NamePicker } from "../common/NamePicker";
import { parseEventDate, toDateKey, todayKey } from "../../utils/date";
import {
  groupCalendarEntries,
  formatDateRange,
  dayShort,
  monthShort,
  type GroupItem,
} from "../../utils/multiDay";
import { routes } from "../../config/routes";
import { PastTripPhotos } from "./PastTripPhotos";
import type { CalendarEvent, Meal, User } from "../../types";

interface CalendarArchiveProps {
  events: CalendarEvent[];
  meals?: Meal[];
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
  meals = [],
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

  function hasMeal(eventId: string) {
    return meals.some((m) => m.linked_event_id === eventId);
  }

  // ── Shared pieces ────────────────────────────────────────────────────────

  const ROW_GRID = "grid grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-3 px-4 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:gap-4 sm:px-[18px]";
  const TAG = "inline-flex items-center gap-1 rounded-md border border-line px-1.5 font-mono text-[10.5px] uppercase leading-[18px] tracking-[0.05em] text-ink-2";
  const ICON_BTN = "flex h-8 w-8 items-center justify-center rounded-lg border-1.5 border-line bg-surface text-ink-2 transition-colors hover:border-ink-3 hover:text-ink";

  function DateCell({ top, bottom, isPast }: { top: string; bottom: string; isPast: boolean }) {
    return (
      <span className={`font-mono text-[12px] font-semibold uppercase leading-tight tracking-[0.03em] ${isPast ? "text-ink-3" : "text-ink"}`}>
        {top}
        <small className="block text-[11px] font-normal text-ink-3">{bottom}</small>
      </span>
    );
  }

  function Tags({ ev }: { ev: CalendarEvent }) {
    const meal = hasMeal(ev.id);
    if (!ev.is_hotel && ev.has_con !== false && !meal) return null;
    return (
      <span className="mt-1 flex flex-wrap gap-[5px]">
        {ev.is_hotel && <span className={TAG}><BedDouble size={10} /> Hotel</span>}
        {ev.has_con === false && <span className={TAG}><BedDouble size={10} /> Reisdag</span>}
        {meal && <span className={TAG} title="Etentje gepland"><Utensils size={10} /></span>}
      </span>
    );
  }

  // ── Inline RSVP panel (shared) ───────────────────────────────────────────

  function RsvpPanel({ target }: { target: RsvpTarget }) {
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
        <div className="space-y-2 border-t border-line bg-sunken px-4 pb-3 pt-2.5 sm:px-[18px]">
          <div className="flex items-center justify-between">
            <p className="section-label">
              {label}
            </p>
            <button
              type="button"
              onClick={closeRsvp}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-surface hover:text-ink"
            >
              <X size={13} />
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

  function RsvpButtons({ ev, isPast, isOpen }: { ev: CalendarEvent; isPast: boolean; isOpen: boolean }) {
    if (!hasRsvp || isPast || isOpen) return <span />;
    return (
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); openRsvp({ kind: "single", eventIds: [ev.id], allParticipants: ev.participants }, "join"); }}
          className={ICON_BTN}
          title="Aanmelden"
        >
          <UserPlus size={14} />
        </button>
        {ev.participants.length > 0 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); openRsvp({ kind: "single", eventIds: [ev.id], allParticipants: ev.participants }, "leave"); }}
            className={ICON_BTN}
            title="Afmelden"
          >
            <UserMinus size={14} />
          </button>
        )}
      </div>
    );
  }

  // ── Single event row ─────────────────────────────────────────────────────

  function renderRow(ev: CalendarEvent, date: Date, isPast: boolean) {
    const isSingleRsvpOpen = activeRsvp?.kind === "single" && activeRsvp.eventIds[0] === ev.id;
    const meta = [ev.location, ev.participants.length > 0 ? `${ev.participants.length} aangemeld` : null].filter(Boolean).join(" · ");

    return (
      <div key={ev.id}>
        <div
          onClick={() => { if (!isSingleRsvpOpen) navigate(routes.event.view(ev.id)); }}
          className={`${ROW_GRID} py-3 transition-colors duration-150 ${!isSingleRsvpOpen ? "cursor-pointer hover:bg-sunken" : ""}`}
        >
          <DateCell top={`${date.getDate()} ${monthShort(date)}`} bottom={dayShort(date)} isPast={isPast} />

          <div className="min-w-0">
            <p className={`truncate text-[14px] font-semibold ${isPast ? "text-ink-2" : "text-ink"}`}>
              {ev.event_name}
            </p>
            {meta && <p className="truncate text-[12.5px] text-ink-3">{meta}</p>}
            <Tags ev={ev} />
          </div>

          <RsvpButtons ev={ev} isPast={isPast} isOpen={isSingleRsvpOpen} />
        </div>

        <AnimatePresence>
          {isSingleRsvpOpen && <RsvpPanel target={activeRsvp!} />}
        </AnimatePresence>
      </div>
    );
  }

  // ── Day row inside a group block ─────────────────────────────────────────

  function renderGroupDayRow(ev: CalendarEvent, date: Date, isPast: boolean) {
    const isSingleRsvpOpen = activeRsvp?.kind === "single" && activeRsvp.eventIds[0] === ev.id;

    return (
      <div key={ev.id}>
        <div
          onClick={() => { if (!isSingleRsvpOpen) navigate(routes.event.view(ev.id)); }}
          className={`${ROW_GRID} py-2.5 transition-colors duration-150 ${!isSingleRsvpOpen ? "cursor-pointer hover:bg-sunken" : ""}`}
        >
          <span className="border-l-2 border-line pl-2.5">
            <DateCell top={`${date.getDate()} ${monthShort(date)}`} bottom={dayShort(date)} isPast={isPast} />
          </span>

          <div className="min-w-0">
            <p className={`truncate text-[13.5px] font-medium ${isPast ? "text-ink-3" : "text-ink"}`}>
              {ev.event_name}
            </p>
            <p className="truncate font-mono text-[11.5px] tabular-nums text-ink-3">
              {ev.participants.length > 0 ? `${ev.participants.length} aangemeld` : "Niemand aangemeld"}
            </p>
            <Tags ev={ev} />
          </div>

          <RsvpButtons ev={ev} isPast={isPast} isOpen={isSingleRsvpOpen} />
        </div>

        <AnimatePresence>
          {isSingleRsvpOpen && <RsvpPanel target={activeRsvp!} />}
        </AnimatePresence>
      </div>
    );
  }

  // ── Multi-day group block ────────────────────────────────────────────────

  function renderGroupBlock(item: GroupItem, isPast: boolean) {
    const isExpanded = expandedGroups.has(item.multiDayId);
    // The event's own name, not the shared series label (e.g. "HDCC") —
    // a group of days is still one specific event.
    const title = item.events[0].ev.event_name;
    const dateRange = formatDateRange(item.events.map((e) => e.date));
    const firstDate = item.events[0].date;
    const lastDate = item.events[item.events.length - 1].date;
    const sameMonth = firstDate.getMonth() === lastDate.getMonth();
    const allParticipants = [...new Set(item.events.flatMap((e) => e.ev.participants))];
    const isBulkRsvpOpen = activeRsvp?.kind === "group" && activeRsvp.groupId === item.multiDayId;
    const location = item.events.map((e) => e.ev.location).find(Boolean);

    return (
      <div key={item.multiDayId}>
        {/* Group header */}
        <button
          onClick={() => toggleGroup(item.multiDayId)}
          aria-expanded={isExpanded}
          className={`${ROW_GRID} w-full py-3 text-left transition-colors duration-150 hover:bg-sunken`}
        >
          <DateCell
            top={item.events.length > 1
              ? (sameMonth
                ? `${firstDate.getDate()}–${lastDate.getDate()} ${monthShort(firstDate)}`
                : `${firstDate.getDate()}–${lastDate.getDate()}`)
              : `${firstDate.getDate()} ${monthShort(firstDate)}`}
            bottom={sameMonth ? dayShort(firstDate) : `${monthShort(firstDate)}–${monthShort(lastDate)}`}
            isPast={isPast}
          />

          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <Layers size={13} className="shrink-0 text-ink-3" />
              <span className={`truncate text-[14px] font-semibold ${isPast ? "text-ink-2" : "text-ink"}`}>
                {title}
              </span>
            </span>
            <span className="block truncate text-[12.5px] text-ink-3">
              {item.events.length} {item.events.length === 1 ? "dag" : "dagen"} · {dateRange}
              {location ? ` · ${location}` : ""}
              {!isExpanded && allParticipants.length > 0 ? ` · ${allParticipants.length} aangemeld` : ""}
            </span>
          </span>

          <motion.span
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex h-8 w-8 shrink-0 items-center justify-center text-ink-3"
          >
            <ChevronDown size={16} />
          </motion.span>
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
              <div className="divide-y divide-line border-t border-line">
                {/* Per-day rows */}
                {item.events.map(({ ev, date }) => renderGroupDayRow(ev, date, isPast))}

                {/* Bulk RSVP */}
                {hasRsvp && !isPast && (
                  <div>
                    <AnimatePresence mode="wait">
                      {isBulkRsvpOpen ? (
                        <RsvpPanel key="bulk-panel" target={activeRsvp!} />
                      ) : (
                        <motion.div
                          key="bulk-buttons"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2 px-4 py-2.5 sm:px-[18px]"
                        >
                          <button
                            type="button"
                            onClick={() => openRsvp({
                              kind: "group",
                              eventIds: item.events.map((e) => e.ev.id),
                              allParticipants,
                              groupId: item.multiDayId,
                            }, "join")}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-1.5 border-line bg-surface py-2 text-[12.5px] font-semibold text-ink transition-colors hover:border-ink-3"
                          >
                            <UserPlus size={13} />
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
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-1.5 border-line bg-surface py-2 text-[12.5px] font-semibold text-ink-2 transition-colors hover:border-ink-3 hover:text-ink"
                            >
                              <UserMinus size={13} />
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
    <div className="space-y-5">
      {/* Upcoming */}
      {upcomingItems.length > 0 && (() => {
        const totalPages = Math.ceil(upcomingItems.length / PAGE_SIZE);
        const page = Math.min(upcomingPage, Math.max(0, totalPages - 1));
        const pageItems = upcomingItems.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

        return (
          <div className="card-surface overflow-hidden">
            <div className="divide-y divide-line">
              {pageItems.map((item) =>
                item.type === "single"
                  ? renderRow(item.ev, item.date, false)
                  : renderGroupBlock(item, false),
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-line px-4 py-2">
                <button
                  onClick={() => { setUpcomingPage((p) => Math.max(0, p - 1)); closeRsvp(); }}
                  disabled={page === 0}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-sunken hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => { setUpcomingPage(i); closeRsvp(); }}
                      className={`h-2 rounded-full transition-all ${i === page ? "w-5 bg-ink" : "w-2 bg-line hover:bg-ink-3"}`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => { setUpcomingPage((p) => Math.min(totalPages - 1, p + 1)); closeRsvp(); }}
                  disabled={page === totalPages - 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-sunken hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronRight size={16} />
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
            aria-expanded={historyOpen}
            className="group mb-3 flex w-full items-center justify-between"
          >
            <p className="section-label flex items-center gap-2">
              <Archive size={13} />
              Geschiedenis ({pastEntries.length})
            </p>
            <motion.div
              animate={{ rotate: historyOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-ink-3 transition-colors group-hover:text-ink"
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
                <div className="space-y-3">
                <PastTripPhotos items={pastItems} />
                <div className="card-surface divide-y divide-line overflow-hidden">
                  {pastItems.map((item) =>
                    item.type === "single"
                      ? renderRow(item.ev, item.date, true)
                      : renderGroupBlock(item, true),
                  )}
                </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
