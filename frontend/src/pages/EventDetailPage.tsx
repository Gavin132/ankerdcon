import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { useCalendar } from "../hooks/useCalendar";
import { useUsers } from "../hooks/useUsers";
import { useEventWeather } from "../hooks/useEventWeather";
import { parseEventDate } from "../utils/date";
import { EventHero } from "../components/event/EventHero";
import { WeatherCard, WeatherSkeleton } from "../components/event/WeatherCard";
import { EventLinks } from "../components/event/EventLinks";
import { EventPractical } from "../components/event/EventPractical";
import { EventAttendees } from "../components/event/EventAttendees";

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const { data: events = [] } = useCalendar();
  const { data: users  = [] } = useUsers();

  const event = events.find((e) => e.id === id);

  const weatherDate = (() => {
    if (!event?.date) return undefined;
    const d = parseEventDate(event.date);
    return d ? d.toISOString().split("T")[0] : undefined;
  })();

  const daysUntil = (() => {
    if (!event?.date) return null;
    const d = parseEventDate(event.date);
    if (!d) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - today.getTime()) / 86_400_000);
  })();

  const { data: weather, isLoading: weatherLoading } = useEventWeather(
    event?.location,
    weatherDate,
  );

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-slate-400">
        <CalendarDays size={40} className="opacity-30" />
        <p className="text-sm">Evenement niet gevonden</p>
        <button onClick={() => navigate(-1)} className="text-xs text-sky-500 underline">Terug</button>
      </div>
    );
  }

  const showWeather = !!(event.location && weatherDate);
  const hasPanel = !!(
    event.website || event.ticket_url || event.ticket_sale_start ||
    (event.ticket_types?.length ?? 0) > 0
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* Sticky topbar */}
      <div className="sticky top-0 z-10 flex items-center gap-3 h-14 px-4
                      bg-white/90 dark:bg-slate-950/90 backdrop-blur-md
                      border-b border-slate-200 dark:border-white/[0.06]">
        <button
          onClick={() => navigate(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-xl
                     text-slate-500 dark:text-slate-400
                     hover:bg-slate-100 dark:hover:bg-white/[0.08]
                     hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <span className="font-bold text-slate-900 dark:text-white text-sm truncate">
          {event.event_name}
        </span>
      </div>

      <EventHero event={event} daysUntil={daysUntil} users={users} />

      <div className="max-w-4xl mx-auto px-4 py-7 space-y-6">

        {/* ── Top row: weather (2/3) + ticket panel (1/3) ── */}
        <div className={`grid grid-cols-1 gap-5 ${hasPanel ? "lg:grid-cols-3" : ""}`}>

          {/* Weather — spans 2 cols when panel exists */}
          {showWeather && (
            <div className={hasPanel ? "lg:col-span-2" : ""}>
              {weatherLoading ? (
                <WeatherSkeleton />
              ) : weather ? (
                <WeatherCard weather={weather} />
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 px-5 py-5 flex items-center gap-3 text-slate-400 dark:text-slate-500">
                  <span className="text-2xl">🌐</span>
                  <p className="text-sm">Geen weersdata beschikbaar voor deze datum of locatie.</p>
                </div>
              )}
            </div>
          )}

          {/* Ticket / links panel */}
          {hasPanel && (
            <div className={`${showWeather ? "" : "lg:col-span-3"} h-full`}>
              <EventLinks event={event} />
            </div>
          )}
        </div>

        {/* ── Practical info grid ── */}
        <EventPractical event={event} />

        {/* ── Attendees ── */}
        <EventAttendees participants={event.participants} users={users} />

      </div>
    </div>
  );
}
