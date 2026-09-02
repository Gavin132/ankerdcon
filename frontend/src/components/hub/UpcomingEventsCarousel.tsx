import { useCallback, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { UpcomingEventCard, type EventUrgency } from "./UpcomingEventCard";
import { parseEventDate } from "../../utils/date";
import {
  getGroupTitle,
  formatDateRange,
  multiDayColor,
  type CalendarItem,
  type MultiDayColor,
} from "../../utils/multiDay";
import type { CalendarEvent, Meal, User } from "../../types";
import type { AnchorRect } from "../common/UserProfilePopup";

interface UpcomingEventsCarouselProps {
  /** Upcoming items, nearest first — index 0 is shown by default. */
  items: CalendarItem[];
  /** Full (unfiltered) event list, used to resolve a multi-day group's full date range. */
  allEvents: CalendarEvent[];
  meals?: Meal[];
  groupColorMap: Map<string, MultiDayColor>;
  users: User[];
  onNavigate: (id: string) => void;
  onParticipantClick: (user: User, rect: AnchorRect) => void;
}

function daysUntil(date: Date): number {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000));
}

function urgencyFor(days: number): EventUrgency {
  return days === 0 ? "today" : days === 1 ? "tomorrow" : "normal";
}

/** Maps a grouped calendar item to the flat props UpcomingEventCard expects. */
function cardPropsFor(item: CalendarItem, allEvents: CalendarEvent[], groupColorMap: Map<string, MultiDayColor>) {
  if (item.type === "single") {
    const days = daysUntil(item.date);
    return {
      event: item.ev,
      daysUntil: days,
      urgency: urgencyFor(days),
      isGroupEvent: false,
      groupEvents: null,
      groupColor: null,
      groupTitle: null,
      groupDateRange: null,
    };
  }

  // Expand across every event sharing this multi_day_id (including days already
  // passed) so a trip already in progress still shows its full date range.
  const groupEvents = allEvents
    .filter((ev) => ev.multi_day_id === item.multiDayId)
    .map((ev) => ({ ev, date: parseEventDate(ev.date) }))
    .filter((x): x is { ev: CalendarEvent; date: Date } => x.date !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const isGroupEvent = groupEvents.length > 1;
  const days = daysUntil(item.events[0].date);

  return {
    event: item.events[0].ev,
    daysUntil: days,
    urgency: urgencyFor(days),
    isGroupEvent,
    groupEvents: isGroupEvent ? groupEvents : null,
    groupColor: isGroupEvent ? (groupColorMap.get(item.multiDayId) ?? multiDayColor(item.multiDayId)) : null,
    groupTitle: isGroupEvent ? getGroupTitle(groupEvents) : null,
    groupDateRange: isGroupEvent ? formatDateRange(groupEvents.map((x) => x.date)) : null,
  };
}

function keyFor(item: CalendarItem): string {
  return item.type === "single" ? item.ev.id : item.multiDayId;
}

export function UpcomingEventsCarousel({
  items,
  allEvents,
  meals = [],
  groupColorMap,
  users,
  onNavigate,
  onParticipantClick,
}: UpcomingEventsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }, []);

  function scrollToIndex(i: number) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  if (items.length === 0) return null;

  const cardProps = cardPropsFor(items[0], allEvents, groupColorMap);

  // Nothing to page through — render the plain card, no carousel chrome.
  if (items.length === 1) {
    return (
      <UpcomingEventCard
        {...cardProps}
        meals={meals}
        users={users}
        onNavigate={onNavigate}
        onParticipantClick={onParticipantClick}
      />
    );
  }

  const arrowClass =
    "hidden md:flex absolute top-1/2 -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-sky-500 hover:border-sky-500/30 transition-colors";

  return (
    <div>
      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto snap-x snap-mandatory gap-3 scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => (
            <div key={keyFor(item)} className="w-full shrink-0 snap-center">
              <UpcomingEventCard
                {...cardPropsFor(item, allEvents, groupColorMap)}
                meals={meals}
                users={users}
                onNavigate={onNavigate}
                onParticipantClick={onParticipantClick}
              />
            </div>
          ))}
        </div>

        {/* Positioned fully outside the card's own edge (not overlapping it) —
            only shown from md up, where the centered layout leaves room for
            them without spilling past the viewport on narrow screens. */}
        <button
          type="button"
          onClick={() => scrollToIndex(index - 1)}
          aria-label="Vorig evenement"
          disabled={index === 0}
          className={`${arrowClass} -left-11 ${index === 0 ? "invisible" : ""}`}
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          onClick={() => scrollToIndex(index + 1)}
          aria-label="Volgend evenement"
          disabled={index === items.length - 1}
          className={`${arrowClass} -right-11 ${index === items.length - 1 ? "invisible" : ""}`}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="mt-2.5 flex items-center justify-center gap-1.5">
        {items.map((item, i) => (
          <button
            key={keyFor(item)}
            type="button"
            onClick={() => scrollToIndex(i)}
            aria-label={`Ga naar evenement ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-5 bg-sky-500" : "w-1.5 bg-slate-300 dark:bg-slate-600"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
