import { format, parseISO, isValid } from "date-fns";
import { nl } from "date-fns/locale";
import { parseEventDate } from "./date";

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

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function formatAmount(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency,
  }).format(amount);
}

/** "zaterdag 4 juli 2026" — parses both YYYY-MM-DD and DD-MM-YYYY */
export function formatEventDate(s: string): string {
  const d = parseEventDate(s);
  if (!d) return s;
  return format(d, "EEEE d MMMM yyyy", { locale: nl });
}

/** "dinsdag 30 juni om 05:28" — from a datetime-local string */
export function formatTicketSaleStart(raw: string): string {
  const d = new Date(raw);
  if (!isNaN(d.getTime()))
    return format(d, "EEEE d MMMM 'om' HH:mm", { locale: nl });
  return raw;
}
