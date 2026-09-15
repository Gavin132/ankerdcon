import type { CalendarEvent, Meal, Ride } from "../types";
import { parseEventDate, toDateKey, todayKey } from "./date";
import { formatDateRange, groupCalendarEntries } from "./multiDay";

/**
 * A trip is the unit the Event tab is built around: every day of one
 * multi-day event (days sharing a `multi_day_id`), or a single standalone
 * event day. It is deliberately NOT `event_group_id` — that's only a series
 * label (e.g. every HDCC edition), and those editions stay separate trips.
 */
export interface TripDay {
  ev: CalendarEvent;
  date: Date;
}

export interface Trip {
  /** `multi_day_id` for a multi-day event, otherwise the single event's id. */
  id: string;
  /** Days in chronological order — always at least one. */
  days: TripDay[];
  eventIds: string[];
  /** The event's own name (first day), not the shared series label. */
  title: string;
  dateRange: string;
  location: string;
  isHotel: boolean;
  hasCon: boolean;
  /** Everyone signed up for at least one day of the trip. */
  participants: string[];
}

export type TripTabId = "overview" | "transport" | "food" | "rooms" | "cosplay" | "photos";

export const TRIP_TABS: { id: TripTabId; label: string }[] = [
  { id: "overview",  label: "Overzicht" },
  { id: "transport", label: "Vervoer" },
  { id: "food",      label: "Eten" },
  { id: "rooms",     label: "Kamers" },
  { id: "cosplay",   label: "Cosplay" },
  { id: "photos",    label: "Foto's" },
];

export function isTripTabId(value: string | undefined): value is TripTabId {
  return TRIP_TABS.some((t) => t.id === value);
}

/** Tabs that make sense for this trip — no rooms without a hotel, no cosplay without a con day. */
export function visibleTripTabs(trip: Trip): { id: TripTabId; label: string }[] {
  return TRIP_TABS.filter((t) => {
    if (t.id === "rooms") return trip.isHotel;
    if (t.id === "cosplay") return trip.hasCon;
    return true;
  });
}

export function tripIdOf(ev: CalendarEvent): string {
  return ev.multi_day_id || ev.id;
}

export function buildTrip(events: CalendarEvent[], tripId: string): Trip | null {
  const dayEvents = events.filter((e) => e.multi_day_id === tripId);
  const members = dayEvents.length > 0 ? dayEvents : events.filter((e) => e.id === tripId && !e.multi_day_id);
  const days = members
    .map((ev) => ({ ev, date: parseEventDate(ev.date) }))
    .filter((d): d is TripDay => d.date !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  if (days.length === 0) return null;

  return {
    id: tripId,
    days,
    eventIds: days.map((d) => d.ev.id),
    title: days[0].ev.event_name,
    dateRange: formatDateRange(days.map((d) => d.date)),
    location: days.find((d) => d.ev.location)?.ev.location ?? "",
    isHotel: days.some((d) => d.ev.is_hotel),
    hasCon: days.some((d) => d.ev.has_con !== false),
    participants: [...new Set(days.flatMap((d) => d.ev.participants ?? []))],
  };
}

/** The trip a given event day belongs to, or null when the event doesn't exist. */
export function tripIdForEvent(events: CalendarEvent[], eventId: string): string | null {
  const ev = events.find((e) => e.id === eventId);
  return ev ? tripIdOf(ev) : null;
}

/**
 * The trip the Event tab opens on: the nearest one that hasn't fully ended
 * yet (so a trip already underway stays the current one), or else the most
 * recent past trip. Null when there are no events at all.
 */
export function currentTripId(events: CalendarEvent[]): string | null {
  const today = todayKey();
  const entries = events
    .map((ev) => ({ ev, date: parseEventDate(ev.date) }))
    .filter((x): x is TripDay => x.date !== null);
  const items = groupCalendarEntries(entries);
  if (items.length === 0) return null;

  const lastDayKey = (item: (typeof items)[number]) =>
    toDateKey(item.type === "single" ? item.date : item.events[item.events.length - 1].date);

  const upcoming = items.find((item) => lastDayKey(item) >= today);
  const chosen = upcoming ?? items[items.length - 1];
  return chosen.type === "single" ? tripIdOf(chosen.ev) : chosen.multiDayId;
}

/** True once the trip's last day is in the past. */
export function isTripOver(trip: Trip): boolean {
  return toDateKey(trip.days[trip.days.length - 1].date) < todayKey();
}

/** The day to show when none is picked: today if it's part of the trip, else the first day still ahead, else the first day. */
export function defaultTripDayId(trip: Trip): string {
  const today = todayKey();
  const todayDay = trip.days.find((d) => toDateKey(d.date) === today);
  if (todayDay) return todayDay.ev.id;
  const ahead = trip.days.find((d) => toDateKey(d.date) > today);
  return (ahead ?? trip.days[0]).ev.id;
}

/** Meals linked to any day of the trip (or only `dayId`, when given). */
export function tripMeals(meals: Meal[], trip: Trip, dayId?: string | null): Meal[] {
  const ids = new Set(dayId ? [dayId] : trip.eventIds);
  return meals.filter((m) => !!m.linked_event_id && ids.has(m.linked_event_id));
}

/**
 * Rides for the trip. Heen/Terug rides link to an event day directly;
 * restaurant rides link to a meal, which links to the day.
 */
export function tripRides(rides: Ride[], meals: Meal[], trip: Trip, dayId?: string | null): Ride[] {
  const ids = new Set(dayId ? [dayId] : trip.eventIds);
  const mealDay = new Map(meals.map((m) => [m.id, m.linked_event_id]));
  return rides.filter((r) => {
    if (r.linked_event_id && ids.has(r.linked_event_id)) return true;
    const viaMeal = r.linked_meal_id ? mealDay.get(r.linked_meal_id) : undefined;
    return !!viaMeal && ids.has(viaMeal);
  });
}

export interface TripGaps {
  /** People signed up for the trip without an inbound and/or outbound ride. */
  transport: { name: string; items: ("Heen" | "Terug")[] }[];
  /** People signed up for the trip who aren't on any of its meals (only when it has meals). */
  food: string[];
}

/** Who is still missing transport or food for this trip. Names compare case-insensitively. */
export function tripGaps(trip: Trip, rides: Ride[], meals: Meal[]): TripGaps {
  const thisTripRides = tripRides(rides, meals, trip);
  const onRide = (direction: Ride["direction"]) =>
    new Set(
      thisTripRides
        .filter((r) => r.direction === direction)
        .flatMap((r) => [r.driver, ...(r.passengers ?? [])])
        .filter(Boolean)
        .map((n) => n.toLowerCase()),
    );
  const inbound = onRide("Inbound");
  const outbound = onRide("Outbound");

  const thisTripMeals = tripMeals(meals, trip);
  const eating = new Set(thisTripMeals.flatMap((m) => m.participants ?? []).map((n) => n.toLowerCase()));

  const transport = trip.participants
    .map((name) => {
      const lc = name.toLowerCase();
      const items: ("Heen" | "Terug")[] = [];
      if (!inbound.has(lc)) items.push("Heen");
      if (!outbound.has(lc)) items.push("Terug");
      return { name, items };
    })
    .filter((g) => g.items.length > 0);

  const food = thisTripMeals.length > 0
    ? trip.participants.filter((name) => !eating.has(name.toLowerCase()))
    : [];

  return { transport, food };
}
