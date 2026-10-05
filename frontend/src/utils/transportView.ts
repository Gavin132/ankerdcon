import { getNow } from "../store/time.store";
import { toDateKey } from "./date";
import { planQuickRide } from "./quickRide";
import { tripMeals, type Trip, type TripDay } from "./trips";
import type { Direction, Meal } from "../types";

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
