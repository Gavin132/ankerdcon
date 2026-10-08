import { getNow } from "../store/time.store";
import { toDateKey } from "./date";
import { planQuickRide } from "./quickRide";
import { tripMeals, type Trip, type TripDay } from "./trips";
import type { Direction, Meal, Ride } from "../types";

export interface TransportView {
  direction: Direction;
  dayId: string;
}

/** The trip day a date belongs to. A date outside the trip, or in a gap between
 * its days, picks the next day, else the last. */
export function dayForDateKey(days: TripDay[], key: string): string {
  const exact = days.find((d) => toDateKey(d.date) === key);
  if (exact) return exact.ev.id;
  const next = days.find((d) => toDateKey(d.date) > key);
  return (next ?? days[days.length - 1]).ev.id;
}

/**
 * What the Vervoer sheet opens on: the same direction and day the Hub's
 * "Rit aanbieden" / "Meerijden" tiles use (see `planQuickRide`), and like those
 * tiles the restaurant leg instead of the way back when the trip has no hotel
 * and a meal still to come needs transport. Only a default; the sheet lets
 * the member pick another direction or day.
 */
export function defaultTransportView(trip: Trip, meals: Meal[], now: Date = getNow()): TransportView {
  const lastDay = trip.days[trip.days.length - 1];
  if (toDateKey(now) > toDateKey(lastDay.date)) return { direction: "Outbound", dayId: lastDay.ev.id };

  const plan = planQuickRide(trip.days.map((d) => d.date), now);
  const dayId = dayForDateKey(trip.days, plan.departure.slice(0, 10));

  if (plan.direction === "Outbound" && !trip.isHotel) {
    const mealStillToCome = tripMeals(meals, trip, dayId).some((m) => {
      const at = new Date(m.time.replace(" ", "T")).getTime();
      return m.transport_needed && !Number.isNaN(at) && at > now.getTime();
    });
    if (mealStillToCome) return { direction: "Restaurant", dayId };
  }
  return { direction: plan.direction, dayId };
}

/**
 * Drivers who have a ride one way but none the other, for the trip as a whole: the
 * people to nudge when everyone else already planned the way back. `have` is the
 * direction they did plan, `lack` the one they did not. Names are compared through
 * `canonical`, so a driver under a former name is not counted twice; each is shown
 * under the name the ride has.
 */
export function driversMissing(
  rides: Pick<Ride, "direction" | "driver">[],
  have: Direction,
  lack: Direction,
  canonical: (name: string) => string = (n) => n.toLowerCase(),
): string[] {
  const covered = new Set(rides.filter((r) => r.direction === lack && r.driver).map((r) => canonical(r.driver)));
  const seen = new Set<string>();
  const missing: string[] = [];
  for (const r of rides) {
    if (r.direction !== have || !r.driver) continue;
    const key = canonical(r.driver);
    if (covered.has(key) || seen.has(key)) continue;
    seen.add(key);
    missing.push(r.driver);
  }
  return missing.sort((a, b) => a.localeCompare(b, "nl"));
}
