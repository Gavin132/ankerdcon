import { parseEventDate, todayKey, toDateKey } from "../../utils/date";
import type { AnyAction } from "../../utils/actionItems";
import type { User } from "../../types";

export function resolveUser(name: string, users: User[]) {
  return users.find(
    (u) =>
      u.name === name ||
      u.discord_username === name ||
      u.aliases?.includes(name),
  );
}

export function transposeGaps(
  missing: { name: string; items: string[] }[],
): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const { name, items } of missing) {
    for (const item of items) {
      (map[item] ??= []).push(name);
    }
  }
  return map;
}

export function getActionId(a: AnyAction): string {
  if (a.kind === "event_gap") return `eg-${a.alert.eventName}-${a.alert.date}`;
  if (a.kind === "restaurant_gap") return `rg-${a.gap.id}`;
  if (a.kind === "payment_due") return `pd-${a.share.id}`;
  return `pc-${a.expense.id}`;
}

export function urgencyTag(dateStr: string): "today" | "tomorrow" | null {
  const d = parseEventDate(dateStr);
  if (!d) return null;
  const key = toDateKey(d);
  const today = todayKey();
  if (key === today) return "today";
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (key === toDateKey(tomorrow)) return "tomorrow";
  return null;
}
