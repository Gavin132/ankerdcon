import { getNow } from "../store/time.store";
import type { Direction } from "../types";

/**
 * Default direction for the hub's quick-ride shortcuts, guessed from time of
 * day: overnight through early afternoon you're presumably still at the
 * hotel heading out, and from early afternoon through night you're presumably
 * winding down and heading back. This is only a *default* — the quick-ride
 * popup always lets the user flip it, since e.g. planning tonight's ride
 * ahead of time in the morning would otherwise guess wrong.
 */
export function guessQuickRideDirection(now: Date = getNow()): Direction {
  const hour = now.getHours();
  // 13:00–22:00 same day → heading back to the hotel. Everything else
  // (22:00–13:00 next day) → heading out to the convention.
  return hour >= 13 && hour < 22 ? "Outbound" : "Inbound";
}
