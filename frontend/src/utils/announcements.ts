import type { Announcement, AnnouncementSeverity } from "../types";

const RANK: Record<AnnouncementSeverity, number> = { urgent: 0, warning: 1, info: 2 };

/**
 * The order the banners stack in: urgent first, then warning, then info, and the newest first within one severity.
 * The API sends them newest first, so an urgent one used to sit under an info one. Anything without a date keeps
 * the order it came in (the sort is stable) and sorts after the dated ones of its severity.
 */
export function sortAnnouncements<T extends Pick<Announcement, "severity" | "created_at">>(list: T[]): T[] {
  const time = (a: T) => (a.created_at ? Date.parse(a.created_at) || 0 : 0);
  return [...list].sort((a, b) => (RANK[a.severity] ?? RANK.info) - (RANK[b.severity] ?? RANK.info) || time(b) - time(a));
}
