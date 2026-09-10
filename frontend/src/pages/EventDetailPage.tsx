import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useCallback, useRef, useState } from "react";
import { useSmartBack } from "../hooks/useSmartBack";
import { motion } from "framer-motion";
import { CalendarDays, ChevronRight, Sparkles, Camera, UserCheck, UserMinus, Layers } from "lucide-react";
import { useCalendar, useHotelRooms, useRsvpCalendarEvent, useLeaveCalendarEvent } from "../hooks/useCalendar";
import { useUsers, useCurrentUser } from "../hooks/useUsers";
import { useMeals } from "../hooks/useMeals";
import { useRides } from "../hooks/useRides";
import { useCosplays } from "../hooks/useCosplays";
import { useStoryPhotos } from "../hooks/useStories";
import { useEventWeather } from "../hooks/useEventWeather";
import { parseEventDate } from "../utils/date";
import { useTimeStore, getNow } from "../store/time.store";
import { toast } from "../store/toast.store";
import { routes } from "../config/routes";
import { DetailTopbar } from "../components/detail/DetailTopbar";
import { EventHero } from "../components/event/EventHero";
import { WeatherCard, ClimateAverageCard, WeatherSkeleton } from "../components/event/WeatherCard";
import { HotelInfoCard } from "../components/event/HotelInfoCard";
import { EventLinks } from "../components/event/EventLinks";
import { EventPractical } from "../components/event/EventPractical";
import { EventLinkedMeals } from "../components/event/EventLinkedMeals";
import { EventLinkedRides } from "../components/event/EventLinkedRides";
import { UserAvatar } from "../components/common/UserAvatar";
import { DayStrip } from "../components/event/DayStrip";
import { Button } from "../components/common/Button";
import { Modal } from "../components/common/Modal";
import { NamePicker } from "../components/common/NamePicker";
import { StoryViewer } from "../components/story/StoryViewer";
import { StoryUploadButton } from "../components/story/StoryUploadButton";

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const goBack = useSmartBack(routes.hub);
  useTimeStore((s) => s.override); // re-render when the time-travel override changes
  const { data: events = [], isLoading: eventsLoading } = useCalendar();
  const { data: users    = [] } = useUsers();
  const { data: meals    = [] } = useMeals();
  const { data: rides    = [] } = useRides();
  const { data: cosplays = [] } = useCosplays();
  const { data: me }            = useCurrentUser();

  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const { data: storyPhotos = [] } = useStoryPhotos(id ?? "", { enabled: !!id });
  const [rsvpNames, setRsvpNames] = useState<string[]>([]);
  const [cancelNames, setCancelNames] = useState<string[]>([]);
  const [rsvpAllDays, setRsvpAllDays] = useState(false);
  const [cancelAllDays, setCancelAllDays] = useState(false);
  const rsvpMutation = useRsvpCalendarEvent();
  const leaveMutation = useLeaveCalendarEvent();

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

  const isMultiDay      = !!groupDays && groupDays.length > 1;
  const groupEventIds   = groupDays?.map((d) => d.ev.id) ?? [];
  const groupParticipants = groupDays
    ? [...new Set(groupDays.flatMap((d) => d.ev.participants))]
    : [];

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
    const today = new Date(getNow());
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
        <button onClick={goBack} className="text-xs text-sky-500 underline">Terug</button>
      </div>
    );
  }

  const showWeather = !!(event.location && weatherDate);
  const isTravelDay = event.has_con === false;
  const isFirstDay = !groupDays || currentDayIndex <= 0;
  // Hotel info leads on any travel day, and also on day one of a multi-day
  // trip regardless of has_con — that's arrival/check-in day either way.
  const showHotelInfoCard = event.is_hotel && (isTravelDay || isFirstDay);
  const hasLinks = !!(
    event.website || event.ticket_url || event.ticket_sale_start ||
    (event.ticket_types?.length ?? 0) > 0
  );
  const hasPracticalInfo = !!(
    event.special_instructions || event.parking_info || event.what_to_bring || event.locker_info
  ) || (showHotel && event.is_hotel);

  async function onRsvp() {
    if (rsvpNames.length === 0) return;
    const targetIds = rsvpAllDays && isMultiDay ? groupEventIds : [event!.id];
    try {
      for (const name of rsvpNames) {
        for (const eventId of targetIds) {
          await rsvpMutation.mutateAsync({ id: eventId, userName: name });
        }
      }
      setRsvpNames([]);
      setRsvpAllDays(false);
      setRsvpOpen(false);
      const what = rsvpAllDays && isMultiDay ? `alle ${targetIds.length} dagen van ${event!.event_name}` : event!.event_name;
      toast(
        "success",
        rsvpNames.length === 1
          ? `${rsvpNames[0]} is aangemeld voor ${what}!`
          : `${rsvpNames.length} personen aangemeld voor ${what}!`,
      );
    } catch {
      toast("error", "Kon je niet aanmelden. Probeer opnieuw.");
    }
  }

  async function onShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: event!.event_name, url });
      } catch {
        // user cancelled the share sheet — not an error
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("success", "Link gekopieerd!");
    } catch {
      toast("error", "Kon de link niet kopiëren.");
    }
  }

  async function onCancelRsvp() {
    if (cancelNames.length === 0) return;
    const targetIds = cancelAllDays && isMultiDay ? groupEventIds : [event!.id];
    try {
      for (const name of cancelNames) {
        for (const eventId of targetIds) {
          await leaveMutation.mutateAsync({ id: eventId, userName: name });
        }
      }
      setCancelNames([]);
      setCancelAllDays(false);
      setCancelOpen(false);
      toast(
        "success",
        cancelNames.length === 1
          ? `${cancelNames[0]} afgemeld.`
          : `${cancelNames.length} personen afgemeld.`,
      );
    } catch {
      toast("error", "Kon aanmelding niet annuleren.");
    }
  }

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
      <DetailTopbar title={event.event_name} onBack={goBack} onShare={onShare} />

      {groupDays && groupDays.length > 1 && (
        <DayStrip
          days={groupDays}
          currentId={id!}
          onNavigate={navigateToDay}
        />
      )}

      <EventHero
        event={event}
        daysUntil={daysUntil}
        users={users}
        meals={linkedMeals}
        onRsvpClick={() => setRsvpOpen(true)}
        onCancelClick={() => setCancelOpen(true)}
        groupDays={groupDays ?? undefined}
      />

      {/* ── Main content ── */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">

        {/* 1 ── Linked meal(s) — leads the page when there's a meal plan,
              since that's often the thing people actually need to check. */}
        <EventLinkedMeals meals={linkedMeals} />

        {/* 2 ── Hotel info + Weather — same two slots always, just reordered,
              so switching days via DayStrip doesn't reflow the rest of the
              page: hotel info leads (weather demoted below it) on a travel
              day or on day one of the trip — arrival/check-in day either
              way — weather leads on every other con day. */}
        {showHotelInfoCard && (
          <HotelInfoCard event={event} onHotelClick={() => navigate(routes.eventHotel.view(event.id))} />
        )}

        {showWeather && (
          weatherLoading ? (
            <WeatherSkeleton />
          ) : weather?.kind === "forecast" ? (
            <WeatherCard weather={weather.data} />
          ) : weather?.kind === "climate" ? (
            <ClimateAverageCard climate={weather.data} />
          ) : (
            <div className="card-surface rounded-2xl px-5 py-4 flex items-center gap-3 text-slate-400 dark:text-slate-500">
              <span className="text-2xl">🌐</span>
              <p className="text-sm">Geen weersdata beschikbaar voor deze locatie.</p>
            </div>
          )
        )}

        {/* 3 ── Cosplays (con days only — nothing to cosplay for on a travel day) */}
        {event.has_con && (
          <div className="card-surface rounded-2xl overflow-hidden">
            <div className="h-[3px] bg-gradient-to-r from-blue-400 to-sky-500" />
            <button
              type="button"
              onClick={() => navigate(routes.eventCosplays.view(event.id))}
              className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-white/[0.02] active:bg-slate-100 dark:active:bg-white/[0.04] transition-colors group"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-500/10">
                <Sparkles size={16} className="text-blue-500 dark:text-blue-400" />
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
        )}

        {/* 4 ── Story — photos the group uploaded for this specific day */}
        <div className="card-surface rounded-2xl overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-amber-400 to-rose-500" />
          <div className="flex items-center gap-3 px-5 py-4">
            <button
              type="button"
              onClick={() => storyPhotos.length > 0 && setStoryOpen(true)}
              disabled={storyPhotos.length === 0}
              className="flex flex-1 min-w-0 items-center gap-4 text-left disabled:cursor-default"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-500/10">
                <Camera size={16} className="text-rose-500 dark:text-rose-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">
                  Story
                </p>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {storyPhotos.length === 0
                    ? "Nog geen foto's"
                    : `${storyPhotos.length} foto${storyPhotos.length !== 1 ? "'s" : ""}`}
                </p>
              </div>
              {storyPhotos.length > 0 && (
                <ChevronRight size={15} className="shrink-0 text-slate-300 dark:text-slate-600" />
              )}
            </button>
            <StoryUploadButton eventDayId={event.id} />
          </div>
        </div>

        {/* 5 ── Practical info + hotel + tickets, one combined card */}
        {(hasPracticalInfo || hasLinks) && (
          <div className="card-surface rounded-2xl overflow-hidden">
            <div className="h-[3px] bg-gradient-to-r from-sky-400 via-blue-400 to-teal-500" />
            <div className="px-5 pt-4 pb-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Praktische info
              </p>
            </div>
            <EventPractical
              event={event}
              showHotel={showHotel}
              hotelRooms={hotelRooms}
              participantCount={event.participants.length}
              users={users}
              isAdmin={isAdmin}
              onHotelClick={() => navigate(routes.eventHotel.view(event.id))}
              bare
            />
            {hasPracticalInfo && hasLinks && (
              <div className="border-t border-slate-100 dark:border-slate-800" />
            )}
            {hasLinks && <EventLinks event={event} bare />}
          </div>
        )}

        {/* 6 ── Linked rides */}
        <EventLinkedRides rides={linkedRides} />

      </div>

      <StoryViewer eventDayId={event.id} open={storyOpen} onClose={() => setStoryOpen(false)} />

      {/* RSVP modal */}
      <Modal
        open={rsvpOpen}
        onClose={() => { setRsvpOpen(false); setRsvpNames([]); setRsvpAllDays(false); }}
        title={`Aanmelden — ${event.event_name}`}
        description={event.location || undefined}
        accent="from-emerald-400 to-green-500"
      >
        <div className="space-y-3">
          <NamePicker
            multiple
            options={users.map((u) => u.name).filter((n) => !event.participants.includes(n))}
            value={rsvpNames}
            onChange={setRsvpNames}
            color="green"
          />
          {isMultiDay && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${rsvpAllDays ? "bg-sky-500/10" : "bg-slate-100 dark:bg-slate-800"}`}>
                  <Layers size={14} className={rsvpAllDays ? "text-sky-500" : "text-slate-400"} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Aanmelden voor elke dag</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Geldt voor alle {groupEventIds.length} dagen van {event.event_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={rsvpAllDays}
                onClick={() => setRsvpAllDays((v) => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                  rsvpAllDays ? "bg-sky-500" : "bg-slate-200 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                    rsvpAllDays ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          )}
          <Button onClick={onRsvp} loading={rsvpMutation.isPending} className="w-full" disabled={rsvpNames.length === 0}>
            <UserCheck size={15} />
            {rsvpNames.length === 0 ? "Selecteer een naam" : rsvpNames.length === 1 ? `${rsvpNames[0]} aanmelden` : `${rsvpNames.length} personen aanmelden`}
          </Button>
        </div>
      </Modal>

      {/* Cancel modal */}
      <Modal
        open={cancelOpen}
        onClose={() => { setCancelOpen(false); setCancelNames([]); setCancelAllDays(false); }}
        title="Aanmelding annuleren"
        description={event.event_name}
        accent="from-rose-400 to-red-500"
      >
        <div className="space-y-3">
          <NamePicker
            multiple
            options={cancelAllDays && isMultiDay ? groupParticipants : event.participants}
            value={cancelNames}
            onChange={setCancelNames}
            color="rose"
          />
          {isMultiDay && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cancelAllDays ? "bg-rose-500/10" : "bg-slate-100 dark:bg-slate-800"}`}>
                  <Layers size={14} className={cancelAllDays ? "text-rose-500" : "text-slate-400"} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Afmelden voor elke dag</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Geldt voor alle {groupEventIds.length} dagen van {event.event_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={cancelAllDays}
                onClick={() => { setCancelAllDays((v) => !v); setCancelNames([]); }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
                  cancelAllDays ? "bg-rose-500" : "bg-slate-200 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                    cancelAllDays ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          )}
          <Button variant="danger" onClick={onCancelRsvp} loading={leaveMutation.isPending} className="w-full" disabled={cancelNames.length === 0}>
            <UserMinus size={15} />
            {cancelNames.length === 0 ? "Selecteer een naam" : cancelNames.length === 1 ? `${cancelNames[0]} afmelden` : `${cancelNames.length} personen afmelden`}
          </Button>
        </div>
      </Modal>
    </motion.div>
  );
}
