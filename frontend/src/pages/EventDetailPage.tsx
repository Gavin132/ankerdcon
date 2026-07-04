import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { CalendarDays, ChevronRight, Sparkles, Users } from "lucide-react";
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
import { DayStrip } from "../components/event/DayStrip";

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: events = [], isLoading: eventsLoading } = useCalendar();
  const { data: users    = [] } = useUsers();
  const { data: meals    = [] } = useMeals();
  const { data: rides    = [] } = useRides();
  const { data: cosplays = [] } = useCosplays();
  const { data: me }            = useCurrentUser();

  const rawEvent = events.find((e) => e.id === id);

  // For multi-day events, fall back to sibling day data for any empty field.
  const event = (() => {
    if (!rawEvent?.multi_day_id) return rawEvent;
    const siblings = events.filter(
      (e) => e.multi_day_id === rawEvent.multi_day_id && e.id !== rawEvent.id,
    );
    const pick = <K extends keyof typeof rawEvent>(key: K): typeof rawEvent[K] => {
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

  const isAdmin   = me?.is_admin ?? false;
  const showHotel = !!(event?.is_hotel || isAdmin);
  const { data: hotelRooms = [] } = useHotelRooms(id ?? "", { enabled: showHotel });

  const linkedMeals = meals.filter((m) => m.linked_event_id === id);
  const linkedRides = rides.filter((r) => r.linked_event_id === id);

  const siblingEvents = rawEvent?.multi_day_id
    ? events.filter((e) => e.multi_day_id === rawEvent.multi_day_id && e.id !== rawEvent.id)
    : [];

  // ── Multi-day group navigation ───────────────────────────────────────────
  const groupDays = rawEvent?.multi_day_id
    ? events
        .filter((e) => e.multi_day_id === rawEvent.multi_day_id)
        .map((e) => ({ ev: e, date: parseEventDate(e.date) }))
        .filter((x): x is { ev: typeof rawEvent; date: Date } => x.date !== null)
        .sort((a, b) => a.date.getTime() - b.date.getTime())
    : null;

  const currentDayIndex = groupDays?.findIndex((d) => d.ev.id === id) ?? -1;
  const prevDay         = groupDays && currentDayIndex > 0 ? groupDays[currentDayIndex - 1] : null;
  const nextDay         = groupDays && currentDayIndex < groupDays.length - 1 ? groupDays[currentDayIndex + 1] : null;

  const navigateToDay = useCallback(
    (dayId: string) => navigate(routes.event.view(dayId), { replace: true }),
    [navigate],
  );

  // Keyboard arrow navigation
  useEffect(() => {
    if (!groupDays) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft"  && prevDay) navigateToDay(prevDay.ev.id);
      if (e.key === "ArrowRight" && nextDay) navigateToDay(nextDay.ev.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [groupDays, prevDay, nextDay, navigateToDay]);

  // Touch swipe
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // ── Cosplays ─────────────────────────────────────────────────────────────
  const allRelatedIds = new Set([id, ...siblingEvents.map((e) => e.id)]);
  const eventCosplays = cosplays.filter((c) =>
    c.linked_event_ids.some((eid) => allRelatedIds.has(eid)),
  );
  const cosplayerNames = [...new Set(eventCosplays.map((c) => c.user_name))];

  // ── Weather ──────────────────────────────────────────────────────────────
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

  const { data: weather, isLoading: weatherLoading } = useEventWeather(event?.location, weatherDate);

  if (eventsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="h-14 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800" />
        <div className="animate-pulse space-y-4 p-4 max-w-4xl mx-auto pt-6">
          <div className="h-[280px] rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

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
  const hasLinks = !!(
    event.website || event.ticket_url || event.ticket_sale_start ||
    (event.ticket_types?.length ?? 0) > 0
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-slate-50 dark:bg-slate-950"
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null || touchStartY.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        const dy = e.changedTouches[0].clientY - touchStartY.current;
        touchStartX.current = null;
        touchStartY.current = null;
        if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        if (dx < 0 && nextDay) navigateToDay(nextDay.ev.id);
        if (dx > 0 && prevDay) navigateToDay(prevDay.ev.id);
      }}
    >
      <DetailTopbar title={event.event_name} onBack={() => navigate(-1)} />

      {groupDays && groupDays.length > 1 && (
        <DayStrip
          days={groupDays}
          currentId={id!}
          onNavigate={navigateToDay}
        />
      )}

      <EventHero event={event} daysUntil={daysUntil} users={users} />

      {/* ── Main content ── */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">

        {/* 1 ── Weather */}
        {showWeather && (
          weatherLoading ? (
            <WeatherSkeleton />
          ) : weather ? (
            <WeatherCard weather={weather} />
          ) : (
            <div className="card-surface rounded-2xl px-5 py-4 flex items-center gap-3 text-slate-400 dark:text-slate-500">
              <span className="text-2xl">🌐</span>
              <p className="text-sm">Geen weersdata beschikbaar voor deze locatie.</p>
            </div>
          )
        )}

        {/* 2 ── People & Cosplays */}
        <div className="card-surface rounded-2xl overflow-hidden">
          {/* Split gradient bar */}
          <div className="flex h-[3px]">
            <div className="flex-1 bg-gradient-to-r from-indigo-400 to-violet-500" />
            <div className="flex-1 bg-gradient-to-r from-violet-500 to-purple-500" />
          </div>

          {/* Aanmeldingen */}
          {event.participants.length > 0 ? (
            <>
              <div className="px-5 pt-4 pb-0 flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-100 dark:bg-indigo-500/10">
                  <Users size={11} className="text-indigo-500" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Aanmeldingen
                </p>
              </div>
              <EventAttendees participants={event.participants} users={users} bare />
            </>
          ) : (
            <div className="px-5 py-4 flex items-center gap-3 text-slate-400 dark:text-slate-500">
              <Users size={15} className="shrink-0" />
              <p className="text-sm">Nog geen aanmeldingen</p>
            </div>
          )}

          {/* Divider */}
          <div className="mx-5 border-t border-slate-100 dark:border-slate-800" />

          {/* Cosplays */}
          <button
            type="button"
            onClick={() => navigate(routes.eventCosplays.view(event.id))}
            className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-white/[0.02] active:bg-slate-100 dark:active:bg-white/[0.04] transition-colors group"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-500/10">
              <Sparkles size={16} className="text-violet-500 dark:text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">
                Cosplays
              </p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {eventCosplays.length === 0
                  ? "Nog geen cosplays — voeg toe"
                  : `${eventCosplays.length} cosplay${eventCosplays.length !== 1 ? "s" : ""} · ${cosplayerNames.length} ${cosplayerNames.length === 1 ? "persoon" : "personen"}`}
              </p>
              {cosplayerNames.length > 0 && (
                <div className="mt-1.5 flex -space-x-1.5">
                  {cosplayerNames.slice(0, 7).map((name) => {
                    const u = users.find((x) => x.name === name || x.discord_username === name || x.aliases?.includes(name));
                    return (
                      <UserAvatar key={name} name={u?.name ?? name} user={u} className="h-5 w-5 text-[7px] ring-[1.5px] ring-white dark:ring-slate-900" />
                    );
                  })}
                </div>
              )}
            </div>
            <ChevronRight size={15} className="shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-500 transition-colors" />
          </button>
        </div>

        {/* 3 ── Practical info + hotel */}
        <EventPractical
          event={event}
          showHotel={showHotel}
          hotelRooms={hotelRooms}
          participantCount={event.participants.length}
          users={users}
          isAdmin={isAdmin}
          onHotelClick={() => navigate(routes.eventHotel.view(event.id))}
        />

        {/* 4 ── Tickets & links */}
        {hasLinks && <EventLinks event={event} />}

        {/* 5 ── Linked activities */}
        <EventLinkedMeals meals={linkedMeals} />
        <EventLinkedRides rides={linkedRides} />

      </div>
    </motion.div>
  );
}
