import { Link } from "react-router-dom";
import { Car, TrainFront, Utensils } from "lucide-react";
import { tripMeals, tripRides, type Trip } from "../../../utils/trips";
import { routes } from "../../../config/routes";
import type { Meal, Ride } from "../../../types";

interface PlanItem {
  id: string;
  dayKey: string;
  time: string;
  kind: "ride" | "meal";
  title: string;
  sub: string;
  to: string;
  icon: typeof Car;
}

const DAYS = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
const MONTHS = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

/** "2026-09-25 09:00" → ["2026-09-25", "09:00"]. */
function splitDateTime(value: string): [string, string] {
  const [date = "", time = ""] = value.trim().split(/[ T]/);
  return [date, time.slice(0, 5)];
}

function planItems(trip: Trip, rides: Ride[], meals: Meal[], past: boolean): PlanItem[] {
  const rideItems = tripRides(rides, meals, trip).map((r): PlanItem => {
    const [dayKey, time] = splitDateTime(r.departure_time);
    const people = r.passengers.length;
    const label = r.direction === "Inbound" ? "Heen" : r.direction === "Outbound" ? "Terug" : "Naar het restaurant";
    const from = r.start_location ? ` vanuit ${r.start_location}` : "";
    return {
      id: `ride-${r.id}`,
      dayKey,
      time,
      kind: "ride",
      title: `${label}${from}`,
      sub: `${r.driver}${past ? " reed" : ""} · ${people} ${people === 1 ? "passagier" : "passagiers"}${!past && r.seats_left > 0 ? ` · ${r.seats_left} vrij` : ""}`,
      to: routes.ride.view(r.id),
      icon: r.is_public_transport ? TrainFront : Car,
    };
  });
  const mealItems = tripMeals(meals, trip).map((m): PlanItem => {
    const [dayKey, time] = splitDateTime(m.time);
    return {
      id: `meal-${m.id}`,
      dayKey,
      time,
      kind: "meal",
      title: m.meal_name,
      sub: `${m.participants.length} mee${m.location ? ` · ${m.location}` : ""}`,
      to: routes.meal.view(m.id),
      icon: Utensils,
    };
  });
  return [...rideItems, ...mealItems].sort((a, b) => `${a.dayKey} ${a.time}`.localeCompare(`${b.dayKey} ${b.time}`));
}

interface TripPlanListProps {
  trip: Trip;
  rides: Ride[];
  meals: Meal[];
  /** Only this day (YYYY-MM-DD); every day of the trip when left out. */
  dayKey?: string | null;
  past: boolean;
}

/** The rides and meals of a trip in time order, grouped per day. */
export function TripPlanList({ trip, rides, meals, dayKey, past }: TripPlanListProps) {
  const items = planItems(trip, rides, meals, past).filter((i) => !dayKey || i.dayKey === dayKey);

  if (items.length === 0) {
    return <p className="text-[13px] text-ink-3">{past ? "Geen ritten of etentjes vastgelegd." : "Nog geen ritten of etentjes gepland."}</p>;
  }

  let previousDay: string | null = null;
  return (
    <ol>
      {items.map((item, i) => {
        const showDay = !dayKey && item.dayKey !== previousDay;
        previousDay = item.dayKey;
        const date = new Date(`${item.dayKey}T00:00:00`);
        const Icon = item.icon;
        return (
          <li key={item.id}>
            {showDay && !isNaN(date.getTime()) && (
              <p className="pt-2 font-mono text-[10.5px] uppercase tracking-[0.06em] text-ink-3">
                {DAYS[date.getDay()]} {date.getDate()} {MONTHS[date.getMonth()]}
              </p>
            )}
            <Link
              to={item.to}
              className={`grid grid-cols-[44px_18px_minmax(0,1fr)] items-start gap-2 py-2 text-[13px] hover:bg-sunken ${
                i > 0 && !showDay ? "border-t border-line" : ""
              }`}
            >
              <time className="pt-px font-mono text-[12px] tabular-nums text-ink">{item.time}</time>
              <Icon size={15} className="mt-0.5 text-ink-3" />
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink">{item.title}</span>
                <span className="block truncate text-[11.5px] text-ink-3">{item.sub}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
