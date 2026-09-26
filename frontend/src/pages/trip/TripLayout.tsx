import { useEffect } from "react";
import { Link, Navigate, Outlet, useParams, useSearchParams } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { useCalendar } from "../../hooks/useCalendar";
import { routes } from "../../config/routes";
import { buildTrip, isTripTabId, visibleTripTabs, type TripTabId } from "../../utils/trips";
import { rememberTripTab, type TripOutletContext } from "./tripContext";

/**
 * Shell for the Event tab. Overzicht is the only real page — every other
 * part of the trip (Vervoer, Cosplay, Kamers…) opens as a sheet on top of it,
 * driven by a `?sheet=` query param instead of a path segment, so opening
 * one is always the same route match: Overzicht never remounts (or loses
 * its scroll position) underneath it.
 */
export function TripLayout() {
  const { tripId = "" } = useParams<{ tripId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: events = [], isLoading } = useCalendar();

  const trip = isLoading ? null : buildTrip(events, tripId);

  const sheetParam = searchParams.get("sheet") ?? undefined;
  const activeTab: TripTabId = isTripTabId(sheetParam) ? sheetParam : "overview";

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

  const context: TripOutletContext = { trip, dayId, setDayId, activeTab };
  return <Outlet context={context} />;
}
