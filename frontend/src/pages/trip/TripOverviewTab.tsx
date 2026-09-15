import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { CalendarDays, ChevronRight, Sparkles, Camera, UserCheck, UserMinus, Layers, Share2, Wallet } from "lucide-react";
import { useCalendar, useHotelRooms, useRsvpCalendarEvent, useLeaveCalendarEvent } from "../../hooks/useCalendar";
import { useUsers, useCurrentUser } from "../../hooks/useUsers";
import { useMeals } from "../../hooks/useMeals";
import { useRides } from "../../hooks/useRides";
import { useCosplays } from "../../hooks/useCosplays";
import { useStoryPhotos } from "../../hooks/useStories";
import { useEventWeather } from "../../hooks/useEventWeather";
import { parseEventDate, toDateKey } from "../../utils/date";
import { useTimeStore, getNow } from "../../store/time.store";
import { toast } from "../../store/toast.store";
import { routes } from "../../config/routes";
import { EventHero } from "../../components/event/EventHero";
import { WeatherCard, ClimateAverageCard, WeatherSkeleton } from "../../components/event/WeatherCard";
import { HotelInfoCard } from "../../components/event/HotelInfoCard";
import { EventLinks } from "../../components/event/EventLinks";
import { EventPractical } from "../../components/event/EventPractical";
import { EventLinkedMeals } from "../../components/event/EventLinkedMeals";
import { EventLinkedRides } from "../../components/event/EventLinkedRides";
import { UserAvatar } from "../../components/common/UserAvatar";
import { Button } from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import { NamePicker } from "../../components/common/NamePicker";
import { StoryViewer } from "../../components/story/StoryViewer";
import { StoryUploadButton } from "../../components/story/StoryUploadButton";
import { defaultTripDayId } from "../../utils/trips";
import { useTrip } from "./tripContext";

/**
 * Event › Overzicht: everything about one day of the trip — the day picked
 * with the day chips, or by default today / the next day still ahead.
 */
export function TripOverviewTab() {
  const { trip, dayId, setDayId } = useTrip();
  const id = dayId ?? defaultTripDayId(trip);
  const navigate = useNavigate();
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

  const navigateToDay = setDayId;

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

  // ── Cosplays ─────────────────────────────────────────────────────────────
  const allRelatedIds = new Set([id, ...siblingEvents.map((e) => e.id)]);
  const eventCosplays = cosplays.filter((c) =>
    c.linked_event_ids.some((eid) => allRelatedIds.has(eid)),
  );
  const cosplayerNames = [...new Set(eventCosplays.map((c) => c.user_name))];

  // ── Weather ──────────────────────────────────────────────────────────────
  // toDateKey (not toISOString) — toISOString converts to UTC, which shifts
  // the date back a day for anyone in a UTC+ timezone (Netherlands included)
  // whenever a Date built from local midnight crosses back over the UTC day
  // boundary. That silently requested the wrong calendar day's forecast.
  const weatherDate = (() => {
    if (!event?.date) return undefined;
    const d = parseEventDate(event.date);
    return d ? toDateKey(d) : undefined;
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
      <div className="animate-pulse space-y-4">
        <div className="h-[220px] rounded-[14px] bg-sunken" />
        <div className="h-32 rounded-xl bg-sunken" />
      </div>
    );
  }

  if (!rawEvent || !event) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sunken text-ink-3">
          <CalendarDays size={22} />
        </div>
        <p className="text-sm font-semibold text-ink">Deze dag bestaat niet meer</p>
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

  const iconButton =
    "flex h-9 items-center gap-1.5 rounded-xl border-1.5 border-line bg-surface px-3 text-xs font-semibold text-ink-2 " +
    "hover:border-ink-3 hover:text-ink transition-colors disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-2";

  // From xl the panels sit in two columns (logistics left, weather + cosplays
  // right); below that the columns dissolve (`contents`) and `order-*` keeps
  // the single-column reading order.
  const hasLeftPanels = linkedMeals.length > 0 || showHotelInfoCard || hasPracticalInfo || hasLinks || linkedRides.length > 0;
  const hasRightPanels = showWeather || !!event.has_con;
  const twoColumns = hasLeftPanels && hasRightPanels;
  const column = twoColumns ? "contents xl:flex xl:flex-col xl:gap-4" : "contents";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StoryUploadButton eventDayId={event.id} />
        <button
          type="button"
          disabled={storyPhotos.length === 0}
          onClick={() => setStoryOpen(true)}
          className={iconButton}
        >
          <Camera size={14} />
          Story bekijken
        </button>
        <button type="button" onClick={() => navigate(routes.tripExpenses.view(trip.id))} className={iconButton}>
          <Wallet size={14} />
          Uitgaven
        </button>
        <button type="button" onClick={onShare} className={iconButton}>
          <Share2 size={14} />
          Delen
        </button>
      </div>

      <EventHero
        event={event}
        daysUntil={daysUntil}
        users={users}
        meals={linkedMeals}
        onRsvpClick={() => {
          setRsvpOpen(true);
          // Pre-fill with your own name — the common case is signing
          // yourself up, and it's still a multi-select so anyone else can
          // be added or your own name removed before confirming.
          if (me?.name && !event.participants.includes(me.name)) {
            setRsvpNames([me.name]);
          }
        }}
        onCancelClick={() => setCancelOpen(true)}
        groupDays={groupDays ?? undefined}
      />

      {/* ── Main content ── */}
      <div className={`flex flex-col gap-4 ${twoColumns ? "xl:grid xl:grid-cols-2 xl:items-start" : ""}`}>
        <div className={column}>
          {/* 1 ── Linked meal(s) — leads the page when there's a meal plan,
                since that's often the thing people actually need to check. */}
          <div className="order-1 empty:hidden xl:order-none">
            <EventLinkedMeals meals={linkedMeals} />
          </div>

          {/* 2 ── Hotel info + Weather — same two slots always, just reordered,
                so switching days via DayStrip doesn't reflow the rest of the
                page: hotel info leads (weather demoted below it) on a travel
                day or on day one of the trip — arrival/check-in day either
                way — weather leads on every other con day. */}
          {showHotelInfoCard && (
            <div className="order-2 xl:order-none">
              <HotelInfoCard event={event} onHotelClick={() => navigate(routes.trip.view(trip.id, "rooms"))} />
            </div>
          )}

          {/* 4 ── Practical info + hotel + tickets, one combined card */}
          {(hasPracticalInfo || hasLinks) && (
            <div className="card-surface order-5 overflow-hidden xl:order-none">
              <div className="px-5 pb-1 pt-4">
                <p className="section-label">
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
                onHotelClick={() => navigate(routes.trip.view(trip.id, "rooms"))}
                bare
              />
              {hasPracticalInfo && hasLinks && (
                <div className="h-px bg-line" />
              )}
              {hasLinks && <EventLinks event={event} bare />}
            </div>
          )}

          {/* 5 ── Linked rides */}
          <div className="order-6 empty:hidden xl:order-none">
            <EventLinkedRides rides={linkedRides} />
          </div>
        </div>

        <div className={column}>
          {showWeather && (
            <div className="order-3 xl:order-none">
              {weatherLoading ? (
                <WeatherSkeleton />
              ) : weather?.kind === "forecast" ? (
                <WeatherCard weather={weather.data} />
              ) : weather?.kind === "climate" ? (
                <ClimateAverageCard climate={weather.data} />
              ) : (
                <div className="card-surface flex items-center gap-3 px-5 py-4 text-ink-3">
                  <span className="text-2xl">🌐</span>
                  <p className="text-sm">Geen weersdata beschikbaar voor deze locatie.</p>
                </div>
              )}
            </div>
          )}

          {/* 3 ── Cosplays (con days only — nothing to cosplay for on a travel day) */}
          {event.has_con && (
            <div className="card-surface order-4 overflow-hidden xl:order-none">
              <button
                type="button"
                onClick={() => navigate(routes.trip.view(trip.id, "cosplay"))}
                className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-sunken"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink group-hover:bg-surface">
                  <Sparkles size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="section-label mb-0.5">
                    Cosplays
                  </p>
                  <p className="text-sm font-semibold text-ink">
                    {eventCosplays.length === 0
                      ? "Nog geen cosplays — voeg toe"
                      : `${eventCosplays.length} cosplay${eventCosplays.length !== 1 ? "s" : ""} · ${cosplayerNames.length} ${cosplayerNames.length === 1 ? "persoon" : "personen"}`}
                  </p>
                  {cosplayerNames.length > 0 && (
                    <div className="mt-1.5 flex -space-x-1.5">
                      {cosplayerNames.slice(0, 7).map((name) => {
                        const u = users.find((x) => x.name === name || x.discord_username === name || x.aliases?.includes(name));
                        return (
                          <UserAvatar key={name} name={u?.name ?? name} user={u} className="h-5 w-5 text-[7px] !border-[1.5px] !border-surface" />
                        );
                      })}
                    </div>
                  )}
                </div>
                <ChevronRight size={15} className="shrink-0 text-ink-3 transition-colors group-hover:text-ink" />
              </button>
            </div>
          )}
        </div>
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
            <div className="flex items-center justify-between gap-3 rounded-xl border-1.5 border-line bg-sunken p-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${rsvpAllDays ? "bg-brand-soft" : "bg-surface"}`}>
                  <Layers size={14} className={rsvpAllDays ? "text-brand-text" : "text-ink-3"} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink">Aanmelden voor elke dag</p>
                  <p className="mt-0.5 text-[11px] text-ink-3">
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
                  rsvpAllDays ? "bg-sky-500" : "bg-line"
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
            <div className="flex items-center justify-between gap-3 rounded-xl border-1.5 border-line bg-sunken p-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cancelAllDays ? "bg-rose-100 dark:bg-rose-500/15" : "bg-surface"}`}>
                  <Layers size={14} className={cancelAllDays ? "text-rose-700 dark:text-rose-300" : "text-ink-3"} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink">Afmelden voor elke dag</p>
                  <p className="mt-0.5 text-[11px] text-ink-3">
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
                  cancelAllDays ? "bg-rose-500" : "bg-line"
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
    </div>
  );
}
