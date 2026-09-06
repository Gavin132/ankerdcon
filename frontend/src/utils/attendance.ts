import type { CalendarEvent } from "../types";
import { formatDateRange } from "./multiDay";

export interface AttendanceException {
  names: string[];
  /** The days within the trip this person/group IS attending. */
  attendingDates: Date[];
}

export interface AttendanceSummary {
  totalCount: number;
  majorityCount: number;
  majorityRangeLabel: string;
  exceptions: AttendanceException[];
}

/**
 * Compares each attendee's exact per-day RSVP pattern across a multi-day
 * trip and calls out only the people who deviate from whatever the most
 * common pattern is — e.g. "everyone's here Fri–Mon" plus "Jan: only Sat–Sun".
 * Keeps the common case (one dominant pattern, a couple of edge cases) from
 * needing a full per-person grid — most trips don't need one.
 */
export function computeAttendanceSummary(
  groupDays: { ev: CalendarEvent; date: Date }[],
): AttendanceSummary | null {
  if (groupDays.length < 2) return null;

  const allNames = [...new Set(groupDays.flatMap((d) => d.ev.participants))];
  if (allNames.length === 0) return null;

  const patternKey = (name: string) =>
    groupDays.map((d) => (d.ev.participants.includes(name) ? "1" : "0")).join("");

  const groups = new Map<string, string[]>();
  for (const name of allNames) {
    const key = patternKey(name);
    groups.set(key, [...(groups.get(key) ?? []), name]);
  }

  let majorityKey = "";
  let majorityCount = 0;
  for (const [key, names] of groups) {
    if (names.length > majorityCount) {
      majorityCount = names.length;
      majorityKey = key;
    }
  }

  const allDates = groupDays.map((d) => d.date);
  const majorityRangeLabel =
    majorityKey === "1".repeat(groupDays.length)
      ? formatDateRange(allDates)
      : formatDateRange(groupDays.filter((_, i) => majorityKey[i] === "1").map((d) => d.date));

  const exceptions: AttendanceException[] = [...groups.entries()]
    .filter(([key]) => key !== majorityKey)
    .map(([key, names]) => ({
      names,
      attendingDates: groupDays.filter((_, i) => key[i] === "1").map((d) => d.date),
    }));

  return { totalCount: allNames.length, majorityCount, majorityRangeLabel, exceptions };
}
