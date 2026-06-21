import { CalendarEvent, Ride, Meal, ActionAlert } from "../../types";

export function computeActionAlerts(
  events: CalendarEvent[],
  rides: Ride[],
  meals: Meal[],
): ActionAlert[] {
  return events
    .map((ev) => {
      const inbound = new Set(
        rides
          .filter((r) => r.direction === "Inbound")
          .flatMap((r) => r.passengers.map((p) => p.toLowerCase())),
      );
      const outbound = new Set(
        rides
          .filter((r) => r.direction === "Outbound")
          .flatMap((r) => r.passengers.map((p) => p.toLowerCase())),
      );
      const rsvps = new Set(
        meals.flatMap((m) => m.rsvps.map((r) => r.toLowerCase())),
      );

      const missing = ev.participants
        .map((name) => {
          const lc = name.toLowerCase();
          const items: string[] = [];
          if (!inbound.has(lc)) items.push("Heen");
          if (!outbound.has(lc)) items.push("Terug");
          if (meals.length > 0 && !rsvps.has(lc)) items.push("Eten");
          return { name, items };
        })
        .filter((m) => m.items.length > 0);

      return { date: ev.date, eventName: ev.event_name, missing };
    })
    .filter((a) => a.missing.length > 0);
}
