import { useEffect } from "react";
import { Link, Navigate, Outlet, useParams, useSearchParams } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { useCalendar } from "../../hooks/useCalendar";
import { usePageHeader } from "../../hooks/usePageHeader";
import { routes } from "../../config/routes";
import { buildTrip, isTripTabId, visibleTripTabs, type TripTabId } from "../../utils/trips";
import { rememberTripTab, type TripOutletContext } from "./tripContext";
import { EmptyState } from "../../components/common/EmptyState";

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
  // The bar gets a back arrow (and, where there is room, the trip's name), so the page does not look like the Agenda card
  // it was opened from. The name is the small line: a phone's bar is full of buttons and would cut a title to "A…".
  usePageHeader({ title: "Event", subtitle: trip?.title ?? "Alles voor deze trip", backTo: routes.calendar });

  const sheetParam = searchParams.get("sheet") ?? undefined;
  const activeTab: TripTabId = isTripTabId(sheetParam) ? sheetParam : "overview";

  // A tab this trip does not have (Cosplay on a concert, Hotel without one) is never remembered, or the Event tab
  // would keep reopening on it.
  const tabAvailable = !!trip && visibleTripTabs(trip).some((t) => t.id === activeTab);
  useEffect(() => {
    if (tabAvailable) rememberTripTab(activeTab);
  }, [activeTab, tabAvailable]);

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
      <EmptyState
        icon={<CalendarDays size={22} />}
        title="Evenement niet gevonden"
        action={
          <Link to={routes.calendar} className="text-xs font-semibold text-brand-text hover:underline">
            Bekijk de agenda
          </Link>
        }
      />
    );
  }

  const requestedDay = searchParams.get("day");
  const dayId = requestedDay && trip.eventIds.includes(requestedDay) ? requestedDay : null;

  // A link to a sheet this trip does not have (?sheet=cosplay on a concert, from an old link or a search result)
  // is plain Overzicht, with the chosen day kept.
  if (!tabAvailable) {
    return <Navigate to={routes.trip.view(trip.id, "overview", dayId ?? undefined)} replace />;
  }

  function setDayId(next: string | null) {
    const params = new URLSearchParams(searchParams);
    if (next) params.set("day", next);
    else params.delete("day");
    setSearchParams(params, { replace: true });
  }

  const context: TripOutletContext = { trip, dayId, setDayId, activeTab };
  return <Outlet context={context} />;
}
