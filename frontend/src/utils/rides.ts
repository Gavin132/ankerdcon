import { getNow } from "../store/time.store";
import { toDateKey, todayKey } from "./date";
import type { CalendarEvent, Ride } from "../types";

export type RideStatus = "upcoming" | "soon" | "urgent" | "recent" | "past";

export function getRideStatus(departureTime: string): {
  status: RideStatus;
  minutesUntil: number;
} {
  const dep = new Date(departureTime.replace(" ", "T")).getTime();
  if (isNaN(dep)) return { status: "upcoming", minutesUntil: Infinity };
  const minutesUntil = (dep - getNow().getTime()) / 60000;
  if (minutesUntil > 120) return { status: "upcoming", minutesUntil };
  if (minutesUntil > 30) return { status: "soon", minutesUntil };
  if (minutesUntil > 0) return { status: "urgent", minutesUntil };
  if (minutesUntil > -120) return { status: "recent", minutesUntil };
  return { status: "past", minutesUntil };
}

export function formatCountdown(minutes: number): string {
  const m = Math.ceil(minutes);
  if (m >= 60) return `${Math.floor(m / 60)}u ${m % 60}m`;
  return `${m}m`;
}

/**
 * Turns a raw ride location into a human-friendly label. Quick hotel-shuttle
 * rides store the linked event's own venue/hotel address as start/end
 * location — showing that raw address reads as "a random destination"
 * rather than something recognizable, so this recognizes those two specific
 * values and swaps in the event name / "Hotel" instead. Falls back to
 * `fallback` when the location hasn't been filled in at all.
 */
export function rideLocationLabel(
  location: string | null | undefined,
  linkedEvent: CalendarEvent | undefined,
  fallback: string,
): string {
  if (!location) return fallback;
  if (linkedEvent) {
    if (location === linkedEvent.location) return linkedEvent.event_name;
    if (linkedEvent.hotel_location && location === linkedEvent.hotel_location) return "Hotel";
  }
  return location;
}

/** "Vandaag" / "Morgen" / "zaterdag 25 september", for a group heading. */
function rideDayLabel(date: Date): string {
  const key = toDateKey(date);
  if (key === todayKey()) return "Vandaag";
  const tomorrow = new Date(getNow());
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (key === toDateKey(tomorrow)) return "Morgen";
  return date.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
}

/** Buckets an already time-sorted ride list into consecutive same-day groups. */
export function groupRidesByDay(rides: Ride[]): { label: string; rides: Ride[] }[] {
  const groups: { label: string; rides: Ride[] }[] = [];
  for (const ride of rides) {
    const parsed = new Date(ride.departure_time.replace(" ", "T"));
    const label = isNaN(parsed.getTime()) ? "Onbekende datum" : rideDayLabel(parsed);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.rides.push(ride);
    else groups.push({ label, rides: [ride] });
  }
  return groups;
}

