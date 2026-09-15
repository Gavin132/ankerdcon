import { useEffect } from "react";
import { Link, Navigate, Outlet, useLocation, useParams, useSearchParams } from "react-router-dom";
import { CalendarDays, MapPin } from "lucide-react";
import { useCalendar } from "../../hooks/useCalendar";
import { useRides } from "../../hooks/useRides";
import { useMeals } from "../../hooks/useMeals";
import { useTimeStore } from "../../store/time.store";
import { routes } from "../../config/routes";
import { DayChips } from "../../components/trip/DayChips";
import { daysBetween, toDateKey, todayKey } from "../../utils/date";
import { buildTrip, defaultTripDayId, isTripOver, isTripTabId, tripGaps, visibleTripTabs, type Trip, type TripTabId } from "../../utils/trips";
import { rememberTripTab, type TripOutletContext } from "./tripContext";

function whenLabel(trip: Trip): string {
  const today = todayKey();
  const untilStart = daysBetween(today, toDateKey(trip.days[0].date));
  const untilEnd = daysBetween(today, toDateKey(trip.days[trip.days.length - 1].date));
  if (untilEnd < 0) return "Geweest";
  if (untilStart <= 0) return "Nu bezig";
  if (untilStart === 1) return "Morgen";
  return `Nog ${untilStart} dagen`;
}

/**
 * Shell for the Event tab: the trip's name, its sub-tabs and (where a tab
 * filters by day) the day chips. Each sub-tab renders in the Outlet with the
 * trip in context.
 */
export function TripLayout() {
  const { tripId = "" } = useParams<{ tripId: string }>();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  useTimeStore((s) => s.override); // re-render when the time-travel override changes

  const { data: events = [], isLoading } = useCalendar();
  const { data: rides = [] } = useRides();
  const { data: meals = [] } = useMeals();

  const segment = location.pathname.split("/")[3];
  const activeTab: TripTabId = isTripTabId(segment) ? segment : "overview";

  useEffect(() => {
    rememberTripTab(activeTab);
  }, [activeTab]);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-16 rounded-2xl bg-sunken" />
        <div className="h-10 rounded-2xl bg-sunken" />
        <div className="h-64 rounded-2xl bg-sunken" />
      </div>
    );
  }

  const trip = buildTrip(events, tripId);

  if (!trip) {
    // A day id of a multi-day event: send it to the whole trip, keeping the day.
    const dayEvent = events.find((e) => e.id === tripId && e.multi_day_id);
    if (dayEvent?.multi_day_id) {
      return <Navigate to={routes.trip.view(dayEvent.multi_day_id, activeTab, dayEvent.id)} replace />;
    }
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center text-slate-400">
        <CalendarDays size={40} className="opacity-30" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Evenement niet gevonden</p>
        <Link to={routes.calendar} className="text-xs font-semibold text-sky-500 hover:underline">
          Bekijk de agenda
        </Link>
      </div>
    );
  }

  const tabs = visibleTripTabs(trip);
  if (!tabs.some((t) => t.id === activeTab)) {
    return <Navigate to={routes.trip.view(trip.id)} replace />;
  }

  const requestedDay = searchParams.get("day");
  const dayId = requestedDay && trip.eventIds.includes(requestedDay) ? requestedDay : null;

  function setDayId(next: string | null) {
    const params = new URLSearchParams(searchParams);
    if (next) params.set("day", next);
    else params.delete("day");
    setSearchParams(params, { replace: true });
  }

  const gaps = isTripOver(trip) ? null : tripGaps(trip, rides, meals);
  const counts: Partial<Record<TripTabId, number>> = {
    transport: gaps?.transport.length ?? 0,
    food: gaps?.food.length ?? 0,
  };

  const showDayChips = trip.days.length > 1 && (activeTab === "overview" || activeTab === "transport" || activeTab === "food");
  const context: TripOutletContext = { trip, dayId, setDayId };

  return (
    <div className="space-y-4">
      <header className="space-y-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
            {whenLabel(trip)} · {trip.dateRange}
          </p>
          <h1 className="mt-1 font-display text-[34px] font-extrabold uppercase leading-[0.95] tracking-[0.005em] text-ink md:text-[42px]">
            {trip.title}
          </h1>
          {trip.location && (
            <p className="mt-1.5 flex items-center gap-1.5 truncate text-[13px] text-ink-2">
              <MapPin size={13} className="shrink-0" />
              {trip.location}
            </p>
          )}
        </div>

        <nav
          aria-label="Onderdelen van dit event"
          className="-mx-4 flex gap-1 overflow-x-auto border-b-1.5 border-line px-4 md:mx-0 md:px-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map((tab) => {
            const count = counts[tab.id] ?? 0;
            return (
              <Link
                key={tab.id}
                to={routes.trip.view(trip.id, tab.id, dayId ?? undefined)}
                replace
                className={`-mb-[1.5px] flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13.5px] font-semibold whitespace-nowrap transition-colors ${
                  tab.id === activeTab
                    ? "border-ink text-ink"
                    : "border-transparent text-ink-3 hover:text-ink"
                }`}
                aria-current={tab.id === activeTab ? "page" : undefined}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className="rounded-full bg-amber-100 px-1.5 font-mono text-[11px] font-semibold leading-[17px] text-amber-800 tabular-nums dark:bg-amber-500/15 dark:text-amber-300"
                    aria-label={`${count} ${count === 1 ? "persoon mist" : "mensen missen"} nog iets`}
                  >
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {showDayChips && (
          <DayChips
            days={trip.days}
            value={activeTab === "overview" ? (dayId ?? defaultTripDayId(trip)) : dayId}
            onChange={setDayId}
            allowAll={activeTab !== "overview"}
          />
        )}
      </header>

      <Outlet context={context} />
    </div>
  );
}
