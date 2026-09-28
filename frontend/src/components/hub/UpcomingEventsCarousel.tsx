import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { UpcomingEventCard, type EventUrgency } from "./UpcomingEventCard";
import { parseEventDate } from "../../utils/date";
import { getNow } from "../../store/time.store";
import { formatDateRange, type CalendarItem } from "../../utils/multiDay";
import type { CalendarEvent, Meal, User } from "../../types";
import type { AnchorRect } from "../common/UserProfilePopup";

interface UpcomingEventsCarouselProps {
  /** Upcoming items, nearest first — index 0 is shown by default. */
  items: CalendarItem[];
  /** Full (unfiltered) event list, used to resolve a multi-day group's full date range. */
  allEvents: CalendarEvent[];
  meals?: Meal[];
  users: User[];
  onNavigate: (id: string) => void;
  onParticipantClick: (user: User, rect: AnchorRect) => void;
}

function daysUntil(date: Date): number {
  return Math.max(0, Math.ceil((date.getTime() - getNow().getTime()) / 86_400_000));
}

function urgencyFor(days: number): EventUrgency {
  return days === 0 ? "today" : days === 1 ? "tomorrow" : "normal";
}

/** Maps a grouped calendar item to the flat props UpcomingEventCard expects. */
function cardPropsFor(item: CalendarItem, allEvents: CalendarEvent[]) {
  if (item.type === "single") {
    const days = daysUntil(item.date);
    return {
      event: item.ev,
      daysUntil: days,
      urgency: urgencyFor(days),
      isGroupEvent: false,
      groupEvents: null,
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
    // The Hub carousel shows the nearest day's actual event name (e.g. "HDCC
    // Zomer") rather than getGroupTitle()'s shared event_group_id label
    // ("HDCC") — that label is meant for the admin panel's series filtering,
    // not for identifying which specific event a trip card is about.
    groupTitle: isGroupEvent ? groupEvents[0].ev.event_name : null,
    groupDateRange: isGroupEvent ? formatDateRange(groupEvents.map((x) => x.date)) : null,
  };
}

function keyFor(item: CalendarItem): string {
  return item.type === "single" ? item.ev.id : item.multiDayId;
}

// Long enough to actually read a card, short enough that the row of dots
// still feels alive.
const AUTO_ADVANCE_MS = 10_000;

export function UpcomingEventsCarousel({
  items,
  allEvents,
  meals = [],
  users,
  onNavigate,
  onParticipantClick,
}: UpcomingEventsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  // Bumped on any manual navigation (swipe, dot, arrow) to restart the
  // auto-advance countdown — jumping to the next card moments after someone
  // deliberately picked one would feel like the page fighting them.
  const [autoAdvanceKey, setAutoAdvanceKey] = useState(0);

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

  function scrollToIndexManually(i: number) {
    scrollToIndex(i);
    setAutoAdvanceKey((k) => k + 1);
  }

  const itemCount = items.length;

  useEffect(() => {
    if (itemCount <= 1) return;
    // A carousel that moves on its own is exactly what this preference asks
    // apps to avoid; the dots and arrows still work, just nothing on a timer.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = window.setInterval(() => {
      // A background tab has no visible position to advance from, and
      // resuming it would otherwise show a jump of several cards at once.
      if (document.hidden) return;
      const el = scrollRef.current;
      if (!el || el.clientWidth === 0) return;
      const current = Math.round(el.scrollLeft / el.clientWidth);
      scrollToIndex((current + 1) % itemCount);
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemCount, autoAdvanceKey]);

  if (items.length === 0) return null;

  const cardProps = cardPropsFor(items[0], allEvents);

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
    "flex h-8 w-8 items-center justify-center rounded-lg border-1.5 border-line bg-surface text-ink-2 hover:border-ink-3 hover:text-ink disabled:opacity-40 disabled:hover:border-line transition-colors";

  return (
    <div>
      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          onPointerDown={() => setAutoAdvanceKey((k) => k + 1)}
          className="flex overflow-x-auto snap-x snap-mandatory gap-3 scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => (
            <div key={keyFor(item)} className="w-full shrink-0 snap-center">
              <UpcomingEventCard
                {...cardPropsFor(item, allEvents)}
                meals={meals}
                users={users}
                onNavigate={onNavigate}
                onParticipantClick={onParticipantClick}
              />
            </div>
          ))}
        </div>

      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="flex flex-1 items-center gap-1.5">
          {items.map((item, i) => (
            <button
              key={keyFor(item)}
              type="button"
              onClick={() => scrollToIndexManually(i)}
              aria-label={`Ga naar evenement ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-5 bg-ink" : "w-1.5 bg-line hover:bg-ink-3"
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => scrollToIndexManually(index - 1)}
          aria-label="Vorig evenement"
          disabled={index === 0}
          className={arrowClass}
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => scrollToIndexManually(index + 1)}
          aria-label="Volgend evenement"
          disabled={index === items.length - 1}
          className={arrowClass}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
