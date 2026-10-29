import { format, parseISO, isValid } from "date-fns";
import { nl } from "date-fns/locale";

export function formatDateTime(dateStr: string): string {
  try {
    const parsed = parseISO(dateStr.replace(" ", "T"));
    if (!isValid(parsed)) return dateStr;
    return format(parsed, "d MMM HH:mm", { locale: nl });
  } catch {
    return dateStr;
  }
}

export function formatDate(dateStr: string): string {
  try {
    // DD-MM-YYYY or D-M-YYYY (common Google Sheets date format)
    const dmyMatch = dateStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmyMatch) {
      const d = new Date(+dmyMatch[3], +dmyMatch[2] - 1, +dmyMatch[1]);
      if (!isNaN(d.getTime())) return format(d, "d MMMM yyyy", { locale: nl });
    }
    // YYYY-MM-DD — parse as local midnight to avoid UTC offset shifting the date
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const d = new Date(dateStr + "T00:00:00");
      if (!isNaN(d.getTime())) return format(d, "d MMMM yyyy", { locale: nl });
    }
    const parsed = parseISO(dateStr);
    if (!isValid(parsed)) return dateStr;
    return format(parsed, "d MMMM yyyy", { locale: nl });
  } catch {
    return dateStr;
  }
}

export function formatTime(dateStr: string): string {
  try {
    const parsed = parseISO(dateStr.replace(" ", "T"));
    if (!isValid(parsed)) return dateStr;
    return format(parsed, "HH:mm");
  } catch {
    return dateStr;
  }
}

/** Money, always the Dutch way: "€ 37,50". */
export function formatAmount(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency,
  }).format(amount);
}

/** A date for a table or a list: "17 nov. 2026". `formatDate` is the long one ("17 november 2026"). */
export function formatDateShort(dateStr: string): string {
  try {
    const parsed = parseISO(dateStr.replace(" ", "T"));
    if (!isValid(parsed)) return dateStr;
    return format(parsed, "d MMM yyyy", { locale: nl });
  } catch {
    return dateStr;
  }
}

/** A run of days for a list, the year once: "17 – 19 nov. 2026", "28 okt. – 2 nov. 2026", "17 nov. 2026". */
export function formatDateRangeShort(first: Date, last: Date): string {
  const f = (d: Date, pattern: string) => format(d, pattern, { locale: nl });
  if (first.getTime() === last.getTime()) return f(first, "d MMM yyyy");
  if (first.getFullYear() !== last.getFullYear()) return `${f(first, "d MMM yyyy")} – ${f(last, "d MMM yyyy")}`;
  if (first.getMonth() !== last.getMonth()) return `${f(first, "d MMM")} – ${f(last, "d MMM yyyy")}`;
  return `${f(first, "d")} – ${f(last, "d MMM yyyy")}`;
}

/** A count with its noun in the right form: countOf(1, "rit", "ritten") is "1 rit", countOf(3, ...) is "3 ritten". */
export function countOf(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** A file size: "512 B", "48 KB", "3,2 MB", "1,25 GB". */
export function formatBytes(bytes: number): string {
  const nl1 = (n: number, digits: number) => n.toLocaleString("nl-NL", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${nl1(bytes / 1024, 0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${nl1(bytes / 1024 / 1024, 1)} MB`;
  return `${nl1(bytes / 1024 / 1024 / 1024, 2)} GB`;
}

/** "dinsdag 30 juni om 05:28" — from a datetime-local string */
export function formatTicketSaleStart(raw: string): string {
  const d = new Date(raw);
  if (!isNaN(d.getTime()))
    return format(d, "EEEE d MMMM 'om' HH:mm", { locale: nl });
  return raw;
}
