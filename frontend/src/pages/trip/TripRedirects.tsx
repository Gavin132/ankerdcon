import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { useCalendar } from "../../hooks/useCalendar";
import { routes } from "../../config/routes";
import { currentTripId, isTripTabId, tripIdOf, type TripTabId } from "../../utils/trips";
import { lastTripTab } from "./tripContext";

function Loading() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-8 w-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
    </div>
  );
}

/**
 * `/trip/:tab?` — the Event tab itself. Opens the current trip on the asked-for
 * sub-tab, or else the one used last. Navigation state (e.g. the Hub asking
 * for the Restaurant rides) is passed along.
 */
export function CurrentTripRedirect() {
  const { tab } = useParams<{ tab?: string }>();
  const location = useLocation();
  const { data: events = [], isLoading } = useCalendar();

  if (isLoading) return <Loading />;

  const tripId = currentTripId(events);
  if (!tripId) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center text-slate-400">
        <CalendarDays size={40} className="opacity-30" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Nog geen events gepland</p>
        <Link to={routes.calendar} className="text-xs font-semibold text-sky-500 hover:underline">
          Bekijk de agenda
        </Link>
      </div>
    );
  }

  const remembered = lastTripTab() ?? undefined;
  const target: TripTabId = isTripTabId(tab) ? tab : isTripTabId(remembered) ? remembered : "overview";
  return <Navigate to={routes.trip.view(tripId, target)} state={location.state} replace />;
}

/** `/events/:id` (and its old hotel/cosplay sub-pages) — that day on its trip. */
export function EventDayRedirect({ tab = "overview" }: { tab?: TripTabId }) {
  const { id = "" } = useParams<{ id: string }>();
  const { data: events = [], isLoading } = useCalendar();

  if (isLoading) return <Loading />;

  const event = events.find((e) => e.id === id);
  if (!event) return <Navigate to={routes.trip.view(id, tab)} replace />; // TripLayout shows "niet gevonden"
  return <Navigate to={routes.trip.view(tripIdOf(event), tab, event.id)} replace />;
}

/** `/events/:id/hotel` from before the rework. */
export function EventRoomsRedirect() {
  return <EventDayRedirect tab="rooms" />;
}

/** `/events/:id/cosplays` from before the rework. */
export function EventCosplayRedirect() {
  return <EventDayRedirect tab="cosplay" />;
}
