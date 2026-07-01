import { useParams, useNavigate } from "react-router-dom";
import { CalendarDays, BedDouble, ChevronRight, Sparkles } from "lucide-react";
import { useCalendar, useHotelRooms } from "../hooks/useCalendar";
import { useUsers, useCurrentUser } from "../hooks/useUsers";
import { useMeals } from "../hooks/useMeals";
import { useRides } from "../hooks/useRides";
import { useCosplays } from "../hooks/useCosplays";
import { useEventWeather } from "../hooks/useEventWeather";
import { parseEventDate } from "../utils/date";
import { routes } from "../config/routes";
import { DetailTopbar } from "../components/detail/DetailTopbar";
import { EventHero } from "../components/event/EventHero";
import { WeatherCard, WeatherSkeleton } from "../components/event/WeatherCard";
import { EventLinks } from "../components/event/EventLinks";
import { EventPractical } from "../components/event/EventPractical";
import { EventAttendees } from "../components/event/EventAttendees";
import { EventLinkedMeals } from "../components/event/EventLinkedMeals";
import { EventLinkedRides } from "../components/event/EventLinkedRides";
import { UserAvatar } from "../components/common/UserAvatar";

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const { data: events = [] } = useCalendar();
  const { data: users  = [] } = useUsers();
  const { data: meals  = [] } = useMeals();
  const { data: rides    = [] } = useRides();
  const { data: cosplays = [] } = useCosplays();
  const { data: me } = useCurrentUser();

  const rawEvent = events.find((e) => e.id === id);

  // For multi-day events, fall back to sibling day data for any empty field.
  // This lets the admin fill in details once and have them appear on all day pages.
  const event = (() => {
    if (!rawEvent?.multi_day_id) return rawEvent;
    const siblings = events.filter(
      (e) => e.multi_day_id === rawEvent.multi_day_id && e.id !== rawEvent.id,
    );
    const pick = <K extends keyof typeof rawEvent>(
      key: K,
    ): typeof rawEvent[K] => {
      const v = rawEvent[key];
      if (v != null && v !== "" && !(Array.isArray(v) && v.length === 0)) return v;
      for (const s of siblings) {
        const sv = s[key];
        if (sv != null && sv !== "" && !(Array.isArray(sv) && sv.length === 0)) return sv;
      }
      return v;
    };
    return {
      ...rawEvent,
      description:          pick("description"),
      location:             pick("location"),
      website:              pick("website"),
      ticket_url:           pick("ticket_url"),
      ticket_sale_start:    pick("ticket_sale_start"),
      ticket_types:         pick("ticket_types"),
      locker_info:          pick("locker_info"),
      parking_info:         pick("parking_info"),
      special_instructions: pick("special_instructions"),
      what_to_bring:        pick("what_to_bring"),
    };
  })();

  const isAdmin = me?.is_admin ?? false;
  const showHotel = event?.is_hotel || isAdmin;
  const { data: hotelRooms = [] } = useHotelRooms(id ?? "", { enabled: !!showHotel });
  const linkedMeals = meals.filter((m) => m.linked_event_id === id);
  const linkedRides = rides.filter((r) => r.linked_event_id === id);

  const siblingEvents = rawEvent?.multi_day_id
    ? events.filter(
        (e) => e.multi_day_id === rawEvent.multi_day_id && e.id !== rawEvent.id,
      )
    : [];

  // Cosplays for this event + siblings
  const allRelatedIds = new Set([event.id, ...siblingEvents.map((e) => e.id)]);
  const eventCosplays = cosplays.filter((c) =>
    c.linked_event_ids.some((eid) => allRelatedIds.has(eid)),
  );
  const cosplayerNames = [...new Set(eventCosplays.map((c) => c.user_name))];

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

  if (!rawEvent || !event) {
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
      <DetailTopbar title={event.event_name} onBack={() => navigate(-1)} />
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

        {/* ── Hotel rooms ── */}
        {showHotel && (
          <button
            onClick={() => navigate(routes.eventHotel.view(event.id))}
            className="w-full card-surface rounded-2xl overflow-hidden text-left hover:shadow-md active:scale-[0.99] transition-all duration-150"
          >
            <div className="h-[3px] bg-gradient-to-r from-sky-400 to-indigo-500" />
            <div className="px-5 py-4 flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-500/10">
                <BedDouble size={18} className="text-sky-600 dark:text-sky-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Hotelkamers</p>
                  {!event.is_hotel && isAdmin && (
                    <span className="rounded-full bg-amber-100 dark:bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                      Niet ingeschakeld
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {!event.is_hotel
                    ? "Schakel hotel in via het admin paneel"
                    : hotelRooms.length === 0
                    ? "Nog geen kamers aangemaakt — klik om te beginnen"
                    : `${hotelRooms.length} ${hotelRooms.length === 1 ? "kamer" : "kamers"} · ${new Set(hotelRooms.flatMap((r) => r.occupants)).size} van ${event.participants.length} ingedeeld`}
                </p>
                {hotelRooms.length > 0 && (
                  <div className="mt-2 flex -space-x-1.5">
                    {hotelRooms.slice(0, 4).map((room) =>
                      room.occupants.slice(0, 2).map((name) => {
                        const u = users.find((x) => x.name === name || x.discord_username === name || x.aliases?.includes(name));
                        return (
                          <UserAvatar key={`${room.id}-${name}`} name={u?.name ?? name} user={u} className="h-6 w-6 text-[8px] ring-2 ring-white dark:ring-slate-900" />
                        );
                      })
                    )}
                  </div>
                )}
              </div>
              <ChevronRight size={16} className="text-slate-400 shrink-0" />
            </div>
          </button>
        )}

        {/* ── Aanmeldingen + Cosplays — unified card ── */}
        <div className="card-surface rounded-2xl overflow-hidden">
          {/* Split gradient bar: indigo→violet | violet→purple */}
          <div className="flex h-[3px]">
            <div className="flex-1 bg-gradient-to-r from-indigo-400 to-violet-500" />
            <div className="flex-1 bg-gradient-to-r from-violet-500 to-purple-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-slate-800/60">

            {/* Left: Aanmeldingen */}
            <div>
              <p className="px-5 pt-4 pb-0 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Aanmeldingen
              </p>
              <EventAttendees participants={event.participants} users={users} bare />
            </div>

            {/* Right: Cosplays */}
            <button
              onClick={() => navigate(routes.eventCosplays.view(event.id))}
              className="w-full h-full text-left flex flex-col hover:bg-slate-50 dark:hover:bg-white/[0.02] active:bg-slate-100 dark:active:bg-white/[0.04] transition-colors"
            >
              <p className="px-5 pt-4 pb-0 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Cosplays
              </p>
              <div className="flex-1 px-5 py-4 flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-500/10">
                  <Sparkles size={18} className="text-violet-600 dark:text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {eventCosplays.length === 0 ? "Nog geen cosplays" : `${eventCosplays.length} cosplay${eventCosplays.length !== 1 ? "s" : ""}`}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {eventCosplays.length === 0
                      ? "Klik om cosplays toe te voegen"
                      : `${cosplayerNames.length} ${cosplayerNames.length === 1 ? "persoon" : "personen"}`}
                  </p>
                  {cosplayerNames.length > 0 && (
                    <div className="mt-2 flex -space-x-1.5">
                      {cosplayerNames.slice(0, 6).map((name) => {
                        const u = users.find((x) => x.name === name || x.discord_username === name || x.aliases?.includes(name));
                        return (
                          <UserAvatar key={name} name={u?.name ?? name} user={u} className="h-6 w-6 text-[8px] ring-2 ring-white dark:ring-slate-900" />
                        );
                      })}
                    </div>
                  )}
                </div>
                <ChevronRight size={16} className="text-slate-400 shrink-0" />
              </div>
            </button>

          </div>
        </div>

        {/* ── Linked activities ── */}
        <EventLinkedMeals meals={linkedMeals} />
        <EventLinkedRides rides={linkedRides} />

      </div>
    </div>
  );
}
