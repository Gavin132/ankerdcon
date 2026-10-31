import { Carousel } from "../common/Carousel";
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
  if (items.length === 0) return null;

  // Nothing to page through — render the plain card, no carousel chrome.
  if (items.length === 1) {
    return (
      <UpcomingEventCard
        {...cardPropsFor(items[0], allEvents)}
        meals={meals}
        users={users}
        onNavigate={onNavigate}
        onParticipantClick={onParticipantClick}
      />
    );
  }

  // The shared swipe row (components/common/Carousel.tsx): the Agenda and the event page page through events the same way.
  return (
    <Carousel
      items={items}
      itemKey={keyFor}
      equalHeightFromLg
      pager={{
        dotLabel: (i) => `Ga naar evenement ${i + 1}`,
        prevLabel: "Vorig evenement",
        nextLabel: "Volgend evenement",
        arrowsFrom: "md",
      }}
      renderItem={(item) => (
        <UpcomingEventCard
          {...cardPropsFor(item, allEvents)}
          meals={meals}
          users={users}
          onNavigate={onNavigate}
          onParticipantClick={onParticipantClick}
        />
      )}
    />
  );
}
