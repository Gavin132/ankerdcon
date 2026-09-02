import { getNow } from "../store/time.store";
import type { CalendarEvent, RestaurantDriver } from "../types";

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

export function parseRestaurantDrivers(
  parkingInfo: string,
): RestaurantDriver[] {
  if (!parkingInfo || parkingInfo.trim() === "") return [];
  try {
    const parsed = JSON.parse(parkingInfo);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((d) => typeof d.name === "string" && typeof d.seats === "number")
      .map((d) => ({
        ...d,
        passengers: Array.isArray(d.passengers) ? d.passengers : [],
      }));
  } catch {
    return [];
  }
}
