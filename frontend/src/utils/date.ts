import { getNow } from "../store/time.store";

/**
 * Parse a date string in YYYY-MM-DD or DD-MM-YYYY format.
 * Returns null for invalid or empty values.
 */
export function parseEventDate(str: string): Date | null {
  if (!str) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(str + "T00:00:00");
    return isNaN(d.getTime()) ? null : d;
  }
  const m = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const d = new Date(+m[3], +m[2] - 1, +m[1]);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function todayKey(): string {
  return toDateKey(getNow());
}

/** Whole days from `fromKey` to `toKey` (both YYYY-MM-DD), positive when
 * `toKey` is later. */
export function daysBetween(fromKey: string, toKey: string): number {
  const from = new Date(fromKey + "T00:00:00").getTime();
  const to = new Date(toKey + "T00:00:00").getTime();
  return Math.round((to - from) / 86400000);
}

/** "2026-09-25 09:00" or "2026-09-25T09:00" → ["2026-09-25", "09:00"]. */
export function splitDateTime(value: string): [string, string] {
  const [date = "", time = ""] = value.trim().split(/[ T]/);
  return [date, time.slice(0, 5)];
}

/** "yyyy-mm-ddTHH:mm", the value shape a datetime-local input (or a split date+time pair) needs. */
export function toDateTimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Quick presets for "when do we leave" pickers — covers the common cases
 * (heading off right away, later tonight, or first thing tomorrow) without
 * having to dial in an exact date and time by hand. */
export function quickDepartureOptions(): { label: string; value: string }[] {
  const now = getNow();

  const asap = new Date(now);
  asap.setMinutes(Math.ceil(asap.getMinutes() / 5) * 5, 0, 0);

  const tonight = new Date(now);
  tonight.setHours(19, 0, 0, 0);

  const tomorrowMorning = new Date(now);
  tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
  tomorrowMorning.setHours(9, 0, 0, 0);

  return [
    { label: "Nu", value: toDateTimeLocal(asap) },
    { label: "Vanavond", value: toDateTimeLocal(tonight) },
    { label: "Morgenochtend", value: toDateTimeLocal(tomorrowMorning) },
  ];
}
