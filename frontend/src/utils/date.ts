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
  return toDateKey(new Date());
}
