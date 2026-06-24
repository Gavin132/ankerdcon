import { CalendarEvent, Ride, Meal, ActionAlert } from "../../types";

export function computeActionAlerts(
  events: CalendarEvent[] | undefined,
  rides: Ride[] | undefined,
  meals: Meal[] | undefined,
): ActionAlert[] {
  // 1. Safe fallbacks for the main arrays in case they are loading
  const safeEvents = events ?? [];
  const safeRides = rides ?? [];
  const safeMeals = meals ?? [];

  return safeEvents
    .map((ev) => {
      const inbound = new Set(
        safeRides
          .filter((r) => r.direction === "Inbound")
          // 2. Safe fallback for passengers
          .flatMap((r) => (r.passengers ?? []).map((p) => p.toLowerCase())),
      );
      
      const outbound = new Set(
        safeRides
          .filter((r) => r.direction === "Outbound")
          // Safe fallback for passengers
          .flatMap((r) => (r.passengers ?? []).map((p) => p.toLowerCase())),
      );
      
      const foodRsvps = new Set(
        // 3. CRITICAL: Swapped 'rsvps' for 'participants' to match your new DB!
        safeMeals.flatMap((m) => (m.participants ?? []).map((r) => r.toLowerCase())),
      );

      // Safe fallback for event participants
      const missing = (ev.participants ?? [])
        .map((name) => {
          const lc = name.toLowerCase();
          const items: string[] = [];
          
          if (!inbound.has(lc)) items.push("Heen");
          if (!outbound.has(lc)) items.push("Terug");
          if (safeMeals.length > 0 && !foodRsvps.has(lc)) items.push("Eten");
          
          return { name, items };
        })
        .filter((m) => m.items.length > 0);

      return { date: ev.date, eventName: ev.event_name, missing };
    })
    .filter((a) => a.missing.length > 0);
}