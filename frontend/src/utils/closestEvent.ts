import { getNow } from "../store/time.store";
import { parseEventDate } from "./date";
import type { CalendarEvent } from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The event day nearest to today — today's own if there is one, otherwise
 * whichever is closest going forward or back, upcoming winning a tie. Used to
 * pre-fill what a new expense belongs to. Returns undefined when there are no
 * events with a usable date.
 */
export function closestEventId(events: CalendarEvent[]): string | undefined {
  const now = getNow();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  let best: { id: string; distance: number; upcoming: boolean } | undefined;
  for (const ev of events) {
    const date = parseEventDate(ev.date);
    if (!date) continue;
    const diff = Math.round((date.getTime() - today) / DAY_MS);
    const candidate = { id: ev.id, distance: Math.abs(diff), upcoming: diff >= 0 };
    if (!best || candidate.distance < best.distance || (candidate.distance === best.distance && candidate.upcoming && !best.upcoming)) {
      best = candidate;
    }
  }
  return best?.id;
}
