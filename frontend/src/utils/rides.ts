import type { LucideIcon } from "lucide-react";
import { Car, Train, Truck } from "lucide-react";
import { getNow } from "../store/time.store";
import { toDateKey, todayKey } from "./date";
import type { CalendarEvent, Ride, User } from "../types";

// telegy's own long-running truck-icon joke. Tied to his account rather than
// a name match on `driver` — a name prefix broke the moment he renamed (or
// would've misfired for anyone else it happened to match), a UUID doesn't.
const TELEGY_USER_ID = "f5abce39-3b78-418a-a05a-db8f05cd284f";

function resolveDriverUser(driverName: string, users: User[]): User | undefined {
  return users.find(
    (u) => u.name === driverName || u.discord_username === driverName || u.aliases?.includes(driverName),
  );
}

/**
 * Which icon a ride's vehicle gets, and whether it should render a size
 * down. Public transport always gets the train, telegy always gets his
 * truck regardless of seats, and otherwise a car — full size for a 5-seater,
 * a size smaller for anything with 4 seats or fewer so a compact car reads
 * as visibly smaller than a full one at a glance.
 */
export function rideVehicleIcon(
  driverName: string,
  users: User[],
  totalSeats: number,
  isPublicTransport = false,
): { Icon: LucideIcon; small: boolean } {
  if (isPublicTransport) return { Icon: Train, small: false };
  if (resolveDriverUser(driverName, users)?.id === TELEGY_USER_ID) return { Icon: Truck, small: false };
  return { Icon: Car, small: totalSeats <= 4 };
}

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

