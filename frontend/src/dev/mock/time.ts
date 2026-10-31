// Dates for the made-up data, always counted from today, so the same fixtures show an event that is coming up,
// one that is on right now and one that is over, whatever day it is when someone looks.
const pad = (n: number) => String(n).padStart(2, "0");

function shifted(offsetDays: number): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d;
}

/** "2026-11-21" for today plus `offsetDays`. */
export function dateKey(offsetDays: number): string {
  const d = shifted(offsetDays);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "2026-11-21T08:30:00" (a ride) for today plus `offsetDays` at that time. */
export function rideTime(offsetDays: number, hours: number, minutes = 0): string {
  return `${dateKey(offsetDays)}T${pad(hours)}:${pad(minutes)}:00`;
}

/** "2026-11-21 19:00" (an activity) for today plus `offsetDays` at that time. */
export function mealTime(offsetDays: number, hours: number, minutes = 0): string {
  return `${dateKey(offsetDays)} ${pad(hours)}:${pad(minutes)}`;
}

/** An ISO timestamp for "created at" fields, `daysAgo` days back. */
export function ago(daysAgo: number): string {
  return shifted(-daysAgo).toISOString();
}
