import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Pager } from "../common/Pager";
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

  const itemCount = items.length;

  // On a phone the row is as tall as the card in view, not the tallest card: otherwise a short card sits above an
  // empty gap on its way to the dots. Re-measured when the card changes size (a list of names opening).
  // From `lg` up all cards are as tall as the tallest one (the row stretches them), so paging does not move the dots,
  // the arrows or anything below the carousel.
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [height, setHeight] = useState<number | undefined>(undefined);
  useLayoutEffect(() => {
    const slide = slideRefs.current[index];
    if (!slide) return;
    const measure = () => setHeight(Math.ceil(slide.getBoundingClientRect().height));
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(slide);
    return () => observer.disconnect();
  }, [index, itemCount]);

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

  return (
    <div>
      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{ "--row-h": height === undefined ? undefined : `${height}px` } as React.CSSProperties}
          className="flex h-[var(--row-h)] items-start overflow-x-auto overflow-y-hidden snap-x snap-mandatory gap-3 scroll-smooth transition-[height] duration-200 lg:h-auto lg:items-stretch [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item, i) => (
            // The cards out of view are cut off by the row's height, so they are not for the keyboard or a screen reader either.
            <div
              key={keyFor(item)}
              ref={(el) => { slideRefs.current[i] = el; }}
              className="w-full shrink-0 snap-center"
              {...(i !== index ? ({ inert: "" } as object) : {})}
            >
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

      <Pager
        className="mt-3"
        count={items.length}
        index={index}
        onChange={scrollToIndex}
        dotLabel={(i) => `Ga naar evenement ${i + 1}`}
        prevLabel="Vorig evenement"
        nextLabel="Volgend evenement"
        arrowsFrom="md"
      />
    </div>
  );
}
