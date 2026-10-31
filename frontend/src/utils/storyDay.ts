import type { StoryDaySummary } from "../types";

/** An event day, as far as filing a photo goes: its id and its date as `YYYY-MM-DD`. */
export interface PhotoDay {
  id: string;
  dateKey: string;
}

/** Where a photo goes: an event day, plus the date it was taken when that is the day before or after it. */
export interface PhotoTarget {
  eventDayId: string;
  takenOn: string | null;
}

const dayNumber = (dateKey: string) => {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
};

/**
 * The day a photo taken on `takenKey` is filed under, across every event (the photo may be of another trip than
 * the one being looked at):
 * - on a day of an event: that day;
 * - exactly one day before or after one: that event's nearest day, marked with the date, which the photo card shows
 *   as a day of its own (an event day is something people sign up for, so it must not be made for photos);
 * - further away: the nearest event day, as if it were taken there.
 * Between two equally near days the earlier one wins. Null when there are no event days at all.
 */
export function routePhotoDay(takenKey: string, days: PhotoDay[]): PhotoTarget | null {
  const taken = dayNumber(takenKey);
  let best: { day: PhotoDay; gap: number } | null = null;
  for (const day of days) {
    const gap = Math.abs(dayNumber(day.dateKey) - taken);
    if (!best || gap < best.gap || (gap === best.gap && day.dateKey < best.day.dateKey)) best = { day, gap };
  }
  if (!best) return null;
  return { eventDayId: best.day.id, takenOn: best.gap === 1 ? takenKey : null };
}

/** Everything in a day's summary: the event day itself and the days beside it. */
export function storyPhotoTotal(summary: StoryDaySummary | undefined): number {
  return (summary?.photo_count ?? 0) + (summary?.extra_days ?? []).reduce((sum, d) => sum + d.photo_count, 0);
}
