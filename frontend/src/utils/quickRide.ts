import { getNow } from "../store/time.store";
import { toDateKey, toDateTimeLocal } from "./date";
import { dayShort, monthShort } from "./multiDay";
import type { Direction } from "../types";

/** From this hour on the day is done, so the next ride is tomorrow's. */
export const NIGHT_START_HOUR = 21;
/** From this hour you're presumably winding down and heading back. */
const HEADING_BACK_HOUR = 13;
/** "Morgenochtend" — matches the preset in `quickDepartureOptions`. */
const MORNING_HOUR = 9;

export interface QuickRidePlan {
  direction: Direction;
  /** Pre-selected departure, as a `datetime-local` value. */
  departure: string;
  /** Human wording for when, e.g. "nu", "morgenochtend", "vr 25 sep, ochtend". */
  when: string;
}

function morningOf(day: Date): Date {
  const d = new Date(day);
  d.setHours(MORNING_HOUR, 0, 0, 0);
  return d;
}

/**
 * What the hub's quick-ride tiles should open, from the date and the time of
 * day. `days` are the days of the (possibly multi-day) event.
 *
 * - Before the event starts: a ride *to* the event, the morning it starts —
 *   whatever the time now.
 * - During it: to the event until early afternoon, back after that, and from
 *   21:00 a ride to the event again tomorrow morning — if there is a
 *   tomorrow. After the last day it stays a ride back.
 *
 * Only a *default*: the offer sheet still lets the user flip it.
 */
export function planQuickRide(days: Date[], now: Date = getNow()): QuickRidePlan {
  const today = toDateKey(now);
  const sorted = days.filter((d) => !isNaN(d.getTime())).sort((a, b) => a.getTime() - b.getTime());
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const first = sorted[0];
  if (first && toDateKey(first) > today) {
    const isTomorrow = toDateKey(first) === toDateKey(tomorrow);
    return {
      direction: "Inbound",
      departure: toDateTimeLocal(morningOf(first)),
      when: isTomorrow ? "morgenochtend" : `${dayShort(first)} ${first.getDate()} ${monthShort(first)}, ochtend`,
    };
  }

  const hour = now.getHours();
  const hasTomorrow = sorted.some((d) => toDateKey(d) > today);
  if (hour >= NIGHT_START_HOUR && hasTomorrow) {
    return { direction: "Inbound", departure: toDateTimeLocal(morningOf(tomorrow)), when: "morgenochtend" };
  }

  const asap = new Date(now);
  asap.setMinutes(Math.ceil(asap.getMinutes() / 5) * 5, 0, 0);
  return { direction: hour >= HEADING_BACK_HOUR ? "Outbound" : "Inbound", departure: toDateTimeLocal(asap), when: "nu" };
}
