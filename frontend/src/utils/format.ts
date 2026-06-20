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
