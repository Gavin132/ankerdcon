import type { CalendarEvent } from "../types";

type PracticalFields = Pick<
  CalendarEvent,
  "parking_info" | "what_to_bring" | "locker_info" | "ticket_url" | "ticket_types" | "ticket_sale_start" | "website"
>;

/** The subjects the Info tile counts and lists, in its order. Tickets are there for a link, a list of ticket types or
 * a sale date (all of which the sheet shows), so a trip with only a sale date does not read "0 onderwerpen". */
export function practicalTopics(info: PracticalFields, hasOutliers: boolean): string[] {
  return [
    info.parking_info && "parkeren",
    info.what_to_bring && "meenemen",
    info.locker_info && "lockers",
    (info.ticket_url || info.ticket_sale_start || (info.ticket_types?.length ?? 0) > 0) && "tickets",
    info.website && "website",
    hasOutliers && "aanwezigheid",
  ].filter(Boolean) as string[];
}
