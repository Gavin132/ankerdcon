import type { CalendarEvent } from "../types";

// ── Data model ────────────────────────────────────────────────────────────────

export interface SingleItem {
  type: "single";
  ev: CalendarEvent;
  date: Date;
}

export interface GroupItem {
  type: "group";
  multiDayId: string;
  events: { ev: CalendarEvent; date: Date }[];
}

export type CalendarItem = SingleItem | GroupItem;

// ── Grouping ──────────────────────────────────────────────────────────────────

/** Group a flat sorted entry list into singles + multi-day groups, sorted by first date. */
export function groupCalendarEntries(
  entries: { ev: CalendarEvent; date: Date }[],
): CalendarItem[] {
  const groups = new Map<string, { ev: CalendarEvent; date: Date }[]>();
  const result: CalendarItem[] = [];

  for (const entry of entries) {
    if (entry.ev.multi_day_id) {
      const arr = groups.get(entry.ev.multi_day_id) ?? [];
      arr.push(entry);
      groups.set(entry.ev.multi_day_id, arr);
    } else {
      result.push({ type: "single", ev: entry.ev, date: entry.date });
    }
  }

  for (const [multiDayId, evs] of groups.entries()) {
    result.push({
      type: "group",
      multiDayId,
      events: [...evs].sort((a, b) => a.date.getTime() - b.date.getTime()),
    });
  }

  return result.sort((a, b) => {
    const aDate = a.type === "single" ? a.date : a.events[0].date;
    const bDate = b.type === "single" ? b.date : b.events[0].date;
    return aDate.getTime() - bDate.getTime();
  });
}

// ── Display helpers ───────────────────────────────────────────────────────────

const DAYS_SHORT = ["zo", "ma", "di", "wo", "do", "vr", "za"];
const MONTHS_SHORT = [
  "jan",
  "feb",
  "mrt",
  "apr",
  "mei",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "dec",
];

/**
 * Human-readable title for a multi-day group.
 * Uses the shared event_group_id if all events share one; otherwise the first event name.
 */
export function getGroupTitle(events: { ev: CalendarEvent }[]): string {
  const labels = [
    ...new Set(events.map((e) => e.ev.event_group_id).filter(Boolean)),
  ];
  if (labels.length === 1 && labels[0]) return labels[0];
  return events[0].ev.event_name;
}

/** E.g. "vr 14 – zo 16 mrt" or "vr 14 mrt – zo 2 apr". */
export function formatDateRange(dates: Date[]): string {
  if (dates.length === 0) return "";
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (sorted.length === 1)
    return `${DAYS_SHORT[first.getDay()]} ${first.getDate()} ${MONTHS_SHORT[first.getMonth()]}`;
  if (first.getMonth() === last.getMonth())
    return `${DAYS_SHORT[first.getDay()]} ${first.getDate()} – ${DAYS_SHORT[last.getDay()]} ${last.getDate()} ${MONTHS_SHORT[first.getMonth()]}`;
  return `${DAYS_SHORT[first.getDay()]} ${first.getDate()} ${MONTHS_SHORT[first.getMonth()]} – ${DAYS_SHORT[last.getDay()]} ${last.getDate()} ${MONTHS_SHORT[last.getMonth()]}`;
}

/** Short day label, e.g. "vr". */
export function dayShort(date: Date): string {
  return DAYS_SHORT[date.getDay()];
}

/** Short month label, e.g. "mrt". */
export function monthShort(date: Date): string {
  return MONTHS_SHORT[date.getMonth()];
}
