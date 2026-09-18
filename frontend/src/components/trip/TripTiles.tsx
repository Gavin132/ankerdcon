import { forwardRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, BedDouble, Camera, Car, CloudSun, Sparkles, Utensils, Wallet } from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { StoryUploadButton } from "../story/StoryUploadButton";
import { DayChips } from "./DayChips";
import { WeatherCard, ClimateAverageCard, WeatherSkeleton } from "../event/WeatherCard";
import { EventPractical } from "../event/EventPractical";
import { EventLinks } from "../event/EventLinks";
import { TileText, TilePill, TileValue, TripTile } from "./TripTile";
import { useEventWeather } from "../../hooks/useEventWeather";
import { routes } from "../../config/routes";
import { getNow } from "../../store/time.store";
import { parseEventDate, splitDateTime, toDateKey, todayKey } from "../../utils/date";
import { dayShort } from "../../utils/multiDay";
import { formatCurrency } from "../../utils/format";
import { defaultTripDayId, tripGaps, tripMeals, tripRides, tripRoomGaps, type Trip, type TripDay, type TripPhase } from "../../utils/trips";
import type { CalendarEvent, Cosplay, Expense, HotelRoom, Meal, Ride, StoryDaySummary, User } from "../../types";

const sameName = (names: string[]) => (n: string) => names.some((m) => m.toLowerCase() === n.toLowerCase());
/** ["Gavin", "Sanne", "Luuk"] → "Gavin, Sanne en Luuk". */
const joinNames = (names: string[]) => (names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} en ${names[names.length - 1]}`);
const findUser = (users: User[], p: string) => users.find((u) => u.name === p || u.discord_username === p || u.aliases?.includes(p));

/** "2026-09-25 09:00" → "vr 09:00". */
function dayTime(value: string): string {
  const [dateKey, time] = splitDateTime(value);
  const date = parseEventDate(dateKey);
  return date ? `${dayShort(date)} ${time}` : time;
}

/* ── Vervoer ─────────────────────────────────────────────────────────────── */

export function TransportTile({ trip, phase, rides, meals, myNames }: { trip: Trip; phase: TripPhase; rides: Ride[]; meals: Meal[]; myNames: string[] }) {
  const tripRideList = tripRides(rides, meals, trip).filter((r) => r.direction !== "Restaurant");
  const gaps = tripGaps(trip, rides, meals).transport;
  const isMine = sameName(myNames);
  const mine = (direction: Ride["direction"]) => tripRideList.find((r) => r.direction === direction && [r.driver, ...r.passengers].some(isMine));
  const describe = (r: Ride | undefined, label: string) => {
    if (!r) return `${label}: nog geen rit`;
    const how = isMine(r.driver) ? "rij je zelf" : r.is_public_transport ? "met het ov" : `met ${r.driver}`;
    return `${label} ${how}, ${dayTime(r.departure_time)}`;
  };

  const total = trip.participants.length;
  const missingBack = gaps.filter((g) => g.items.includes("Terug")).length;
  const missing = phase === "live" ? missingBack : gaps.length;
  const bars = phase === "live"
    ? [["Terug", total - missingBack] as const]
    : [["Heen", total - gaps.filter((g) => g.items.includes("Heen")).length] as const, ["Terug", total - missingBack] as const];

  return (
    <TripTile
      icon={Car}
      label="Vervoer"
      to={routes.trip.view(trip.id, "transport")}
      size={phase === "past" ? "small" : "wide"}
      pill={phase !== "past" && missing > 0 && <TilePill>{missing} zonder rit</TilePill>}
    >
      <TileValue>{tripRideList.length === 0 ? "Nog geen ritten" : `${tripRideList.length} ${tripRideList.length === 1 ? "rit" : "ritten"}`}</TileValue>
      {phase !== "past" && (
        <>
          <TileText>
            {phase === "live" ? describe(mine("Outbound"), "Terug") : `${describe(mine("Inbound"), "Heen")} · ${describe(mine("Outbound"), "terug")}`}
          </TileText>
          {total > 0 && (
            <div className="space-y-1.5 pt-1">
              {bars.map(([label, have]) => (
                <div key={label} className="grid grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-2 text-[11.5px] text-ink-3">
                  <span>{label}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-line">
                    <span className="block h-full rounded-full bg-ink-2" style={{ width: `${Math.round((have / total) * 100)}%` }} />
                  </span>
                  <span className="text-right font-mono tabular-nums text-ink-2">{have}/{total}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </TripTile>
  );
}

/* ── Eten ────────────────────────────────────────────────────────────────── */

/**
 * Meals are planned by the organisers in the admin panel, not from here — this
 * tile only answers "is there a mealplan" and links straight to each meal's
 * own detail page, so it has no single `to` of its own (each row is its own link).
 */
export function FoodTile({ trip, phase, meals, myNames }: { trip: Trip; phase: TripPhase; meals: Meal[]; myNames: string[] }) {
  const isMine = sameName(myNames);
  const all = tripMeals(meals, trip).sort((a, b) => a.time.localeCompare(b.time));
  const now = toDateKey(getNow()) + "T" + getNow().toTimeString().slice(0, 5);
  const ahead = all.filter((m) => m.time.replace(" ", "T") >= now);
  const shown = (phase === "live" && ahead.length > 0 ? ahead : all).slice(0, 3);
  const missing = phase === "upcoming" ? tripGaps(trip, [], meals).food.length : 0;

  return (
    <TripTile
      icon={Utensils}
      label="Eten"
      size={phase === "past" ? "small" : "wide"}
      pill={missing > 0 && <TilePill>{missing} nergens bij</TilePill>}
    >
      <TileValue>
        {all.length === 0 ? "Nog niks gepland" : phase === "live" && ahead[0] ? `Straks ${splitDateTime(ahead[0].time)[1]}` : `${all.length} ${all.length === 1 ? "etentje" : "etentjes"}`}
      </TileValue>
      {phase !== "past" && shown.length > 0 && (
        <ul className="-mx-1.5 divide-y divide-line">
          {shown.map((m) => (
            <li key={m.id}>
              <Link
                to={routes.meal.view(m.id)}
                className="grid grid-cols-[62px_minmax(0,1fr)] gap-2 rounded-lg px-1.5 py-1.5 text-[12.5px] transition-colors hover:bg-sunken"
              >
                <span className="pt-px font-mono text-[11.5px] uppercase text-ink-3">{dayTime(m.time)}</span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink">{m.meal_name}</span>
                  <span className="block text-ink-3">
                    {m.participants.length} mee, {m.participants.some(isMine) ? "jij ook" : "jij nog niet"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </TripTile>
  );
}

/* ── Kamers ──────────────────────────────────────────────────────────────── */

export function RoomsTile({ trip, phase, rooms, users, myNames }: { trip: Trip; phase: TripPhase; rooms: HotelRoom[]; users: User[]; myNames: string[] }) {
  const isMine = sameName(myNames);
  const myRoom = rooms.find((r) => r.occupants.some(isMine));
  const roommates = myRoom?.occupants.filter((o) => !isMine(o)) ?? [];
  const missing = phase === "upcoming" ? tripRoomGaps(trip, rooms).length : 0;
  const numbered = (r: HotelRoom) => (r.room_number ? `Kamer ${r.room_number}` : "een kamer");

  return (
    <TripTile
      icon={BedDouble}
      label="Kamers"
      to={routes.trip.view(trip.id, "rooms")}
      size={phase === "past" ? "small" : "wide"}
      pill={missing > 0 && <TilePill>{missing} zonder kamer</TilePill>}
    >
      {phase === "past" || rooms.length === 0 ? (
        <TileValue>{rooms.length === 0 ? "Nog geen kamers" : `${rooms.length} ${rooms.length === 1 ? "kamer" : "kamers"}`}</TileValue>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {rooms.slice(0, 5).map((r) => (
            <span
              key={r.id}
              className={`flex flex-col gap-1 rounded-lg border-1.5 px-2 pb-1.5 pt-1 ${r === myRoom ? "border-brand-text" : "border-line"}`}
            >
              <span className="font-display text-[17px] font-extrabold leading-none text-ink">{r.room_number || "–"}</span>
              <span className="flex -space-x-1">
                {r.occupants.slice(0, 3).map((o) => {
                  const u = findUser(users, o);
                  return <UserAvatar key={o} name={u?.name ?? o} user={u} className="h-[18px] w-[18px] text-[7px] !border-[1.5px] !border-surface" />;
                })}
                {r.occupants.length === 0 && <span className="text-[11px] text-ink-3">leeg</span>}
              </span>
            </span>
          ))}
          {rooms.length > 5 && <span className="self-center font-mono text-[11px] text-ink-3">+{rooms.length - 5}</span>}
        </div>
      )}
      {phase !== "past" && (
        <TileText>
          {myRoom
            ? `Jij slaapt in ${numbered(myRoom).toLowerCase()}${roommates.length ? ` met ${joinNames(roommates)}` : ""}.`
            : rooms.length > 0 ? "Jij hebt nog geen kamer." : "Kamers verschijnen hier zodra ze zijn aangemaakt."}
        </TileText>
      )}
    </TripTile>
  );
}

/* ── Cosplay ─────────────────────────────────────────────────────────────── */

export function CosplayTile({ trip, cosplays, myNames }: { trip: Trip; cosplays: Cosplay[]; myNames: string[] }) {
  const ids = new Set(trip.eventIds);
  const list = cosplays.filter((c) => c.linked_event_ids.some((id) => ids.has(id)));
  const mine = list.find((c) => sameName(myNames)(c.user_name));
  const images = list.map((c) => c.inspo_images[0]).filter(Boolean).slice(0, 5);

  return (
    <TripTile icon={Sparkles} label="Cosplay" to={routes.trip.view(trip.id, "cosplay")}>
      <TileValue>{list.length}</TileValue>
      <TileText>{list.length === 1 ? "cosplay" : "cosplays"}{mine ? `, jij als ${mine.character_name}` : ""}</TileText>
      {images.length > 0 && (
        <span className="flex gap-1">
          {images.map((src, i) => <img key={i} src={src} alt="" className="h-11 w-[34px] rounded-[5px] object-cover" />)}
        </span>
      )}
    </TripTile>
  );
}

/* ── Foto's ──────────────────────────────────────────────────────────────── */

// Brand-blue circle (matches the Vervoer sheet's "+" buttons) instead of the
// neutral icon-button StoryUploadButton normally wears — this one needs to
// read as a pressable action at a glance, not blend in like the ticket's.
const UPLOAD_BUTTON_CLASS =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-1.5 border-outline bg-brand text-brand-on transition-opacity hover:opacity-90";

/**
 * Opens the story viewer directly on the most relevant day instead of
 * linking to a separate Foto's page — there's little here that the tile
 * doesn't already show. Also carries its own upload button (same one as the
 * trip ticket's camera icon) so adding a photo doesn't require hunting for
 * it elsewhere.
 */
export function PhotosTile({ trip, phase, summary, onOpenDay, uploadDayId }: { trip: Trip; phase: TripPhase; summary?: Record<string, StoryDaySummary>; onOpenDay: (dayId: string) => void; uploadDayId?: string }) {
  const perDay = trip.days.map((d) => ({ day: d, s: summary?.[d.ev.id] }));
  const total = perDay.reduce((sum, x) => sum + (x.s?.photo_count ?? 0), 0);
  const today = todayKey();
  const todayEntry = perDay.find((x) => toDateKey(x.day.date) === today);
  const todayCount = todayEntry?.s?.photo_count ?? 0;
  const previews = perDay.filter((x) => x.s && x.s.photo_count > 0 && x.s.preview_url);
  const primaryDay = (todayEntry?.s?.photo_count ? todayEntry : [...previews].reverse()[0])?.day.ev.id;

  return (
    <TripTile
      icon={Camera}
      label="Foto's"
      onOpen={total > 0 && primaryDay ? () => onOpenDay(primaryDay) : undefined}
      size={phase === "past" ? "full" : "wide"}
    >
      {total === 0 ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <TileValue>{phase === "past" ? "Geen foto's" : "Story"}</TileValue>
            {uploadDayId && (
              <span onClick={(e) => e.stopPropagation()} className="shrink-0">
                <StoryUploadButton eventDayId={uploadDayId} className={UPLOAD_BUTTON_CLASS} />
              </span>
            )}
          </div>
          <TileText>
            {phase === "past" ? "Er zijn geen foto's toegevoegd." : "Nog geen foto's. Voeg de eerste toe."}
          </TileText>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <TileValue>{phase === "live" && todayCount > 0 ? `${todayCount} vandaag` : `${total} foto's`}</TileValue>
            {uploadDayId && (
              <span onClick={(e) => e.stopPropagation()} className="shrink-0">
                <StoryUploadButton eventDayId={uploadDayId} className={UPLOAD_BUTTON_CLASS} />
              </span>
            )}
          </div>
          <TileText>
            {trip.days.length > 1
              ? perDay.filter((x) => (x.s?.photo_count ?? 0) > 0).map((x) => `${x.s!.photo_count} op ${dayShort(x.day.date)}`).join(", ")
              : `${total} in de story`}
          </TileText>
          <span className="flex items-center gap-1.5">
            {previews.map((x) => (
              <span
                key={x.day.ev.id}
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); onOpenDay(x.day.ev.id); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onOpenDay(x.day.ev.id); } }}
              >
                <img src={x.s!.preview_url} alt="" className="h-16 w-12 rounded-md object-cover" />
              </span>
            ))}
          </span>
        </>
      )}
    </TripTile>
  );
}

/* ── Uitgaven ────────────────────────────────────────────────────────────── */

export function ExpensesTile({ trip, phase, expenses, myNames }: { trip: Trip; phase: TripPhase; expenses: Expense[]; myNames: string[] }) {
  const isMine = sameName(myNames);
  const ids = new Set(trip.eventIds);
  const list = expenses.filter((e) => e.linked_event_id && ids.has(e.linked_event_id));
  const total = list.reduce((s, e) => s + e.amount, 0);
  const myShares = list.flatMap((e) => e.shares.filter((s) => isMine(s.participant)).map((s) => ({ s, e })));
  const myTotal = myShares.reduce((sum, x) => sum + x.s.amount, 0);
  const open = myShares.filter((x) => x.s.status === "pending" && !isMine(x.e.paid_by)).reduce((sum, x) => sum + x.s.amount, 0);

  return (
    <TripTile
      icon={Wallet}
      label="Uitgaven"
      to={routes.tripExpenses.view(trip.id)}
      size={phase === "past" && open > 0 ? "wide" : "small"}
      pill={open > 0 && <TilePill>Open</TilePill>}
    >
      <TileValue>{list.length === 0 ? "Nog niks" : open > 0 && phase === "past" ? `${formatCurrency(open)} open` : formatCurrency(total)}</TileValue>
      <TileText>
        {list.length === 0
          ? "Gedeelde kosten van deze trip komen hier."
          : open > 0 ? `Jouw deel ${formatCurrency(myTotal)}, nog te betalen ${formatCurrency(open)}` : `Jouw deel ${formatCurrency(myTotal)}`}
      </TileText>
    </TripTile>
  );
}

/* ── Weer (unfolds in place) ─────────────────────────────────────────────── */

function DayForecast({ location, day }: { location: string; day: TripDay }) {
  const { data } = useEventWeather(location, toDateKey(day.date));
  const max = data ? Math.round(data.kind === "forecast" ? data.data.temp_max : data.data.temp_max_avg) : null;
  return (
    <span className="flex flex-col items-center gap-0.5 text-[11px] text-ink-3">
      <span className="text-[17px] leading-none" aria-hidden>{data?.data.icon ?? "·"}</span>
      <b className="font-semibold tabular-nums text-ink">{max === null ? "–" : `${max}°`}</b>
      {dayShort(day.date)}
    </span>
  );
}

export function WeatherTile({ trip, expanded, onToggle }: { trip: Trip; expanded: boolean; onToggle: () => void }) {
  const days = trip.days.filter((d) => toDateKey(d.date) >= todayKey()).slice(0, 4);
  const first = days[0] ?? trip.days[0];
  const { data } = useEventWeather(trip.location, toDateKey(first.date));

  return (
    <TripTile icon={CloudSun} label="Weer" onToggle={onToggle} expanded={expanded}>
      <TileValue>
        {data ? `${Math.round(data.kind === "forecast" ? data.data.temp_max : data.data.temp_max_avg)}°` : "–"}
      </TileValue>
      <TileText>{data ? `${data.kind === "climate" ? "Gemiddeld, " : ""}${data.data.description.toLowerCase()}` : "Nog geen weer"}</TileText>
      {days.length > 1 && (
        <span className="grid grid-cols-4 gap-1">
          {days.map((d) => <DayForecast key={d.ev.id} location={trip.location} day={d} />)}
        </span>
      )}
    </TripTile>
  );
}

export const WeatherPanel = forwardRef<HTMLElement, { trip: Trip }>(function WeatherPanel({ trip }, ref) {
  const [dayId, setDayId] = useState(() => defaultTripDayId(trip));
  const day = trip.days.find((d) => d.ev.id === dayId) ?? trip.days[0];
  const { data: weather, isLoading } = useEventWeather(trip.location, toDateKey(day.date));

  return (
    <section ref={ref} className="col-span-2 space-y-3 lg:col-span-4 scroll-mt-4">
      {trip.days.length > 1 && <DayChips days={trip.days} value={day.ev.id} onChange={(id) => id && setDayId(id)} />}
      {isLoading ? (
        <WeatherSkeleton />
      ) : weather?.kind === "forecast" ? (
        <WeatherCard weather={weather.data} />
      ) : weather?.kind === "climate" ? (
        <ClimateAverageCard climate={weather.data} />
      ) : (
        <div className="card-surface px-5 py-4 text-sm text-ink-3">Geen weersdata beschikbaar voor deze locatie.</div>
      )}
    </section>
  );
});

/* ── Praktisch (unfolds in place) ────────────────────────────────────────── */

export function hasPracticalInfo(info: CalendarEvent): boolean {
  return !!(
    info.special_instructions || info.parking_info || info.what_to_bring || info.locker_info ||
    info.website || info.ticket_url || info.ticket_sale_start || (info.ticket_types?.length ?? 0) > 0
  );
}

export function PracticalTile({ info, expanded, onToggle }: { info: CalendarEvent; expanded: boolean; onToggle: () => void }) {
  const topics = [
    info.parking_info && "parkeren",
    info.what_to_bring && "meenemen",
    info.locker_info && "lockers",
    (info.ticket_url || (info.ticket_types?.length ?? 0) > 0) && "tickets",
    info.website && "website",
  ].filter(Boolean) as string[];

  return (
    <TripTile icon={AlertCircle} label="Praktisch" onToggle={onToggle} expanded={expanded}>
      {info.special_instructions ? (
        <>
          <span><TilePill>Let op</TilePill></span>
          <TileText><span className="line-clamp-2">{info.special_instructions}</span></TileText>
        </>
      ) : (
        <TileValue>Info</TileValue>
      )}
      {topics.length > 0 && <TileText>{topics.join(", ").replace(/^./, (c) => c.toUpperCase())}</TileText>}
    </TripTile>
  );
}

export const PracticalPanel = forwardRef<HTMLElement, { info: CalendarEvent }>(function PracticalPanel({ info }, ref) {
  const hasRows = !!(info.special_instructions || info.parking_info || info.what_to_bring || info.locker_info);
  const hasLinks = !!(info.website || info.ticket_url || info.ticket_sale_start || (info.ticket_types?.length ?? 0) > 0);
  return (
    <section ref={ref} className="card-surface col-span-2 overflow-hidden lg:col-span-4 scroll-mt-4">
      <div className="px-5 pb-1 pt-4">
        <p className="section-label">Praktische info</p>
      </div>
      {hasRows && <EventPractical event={info} bare />}
      {hasRows && hasLinks && <div className="h-px bg-line" />}
      {hasLinks && <EventLinks event={info} bare />}
    </section>
  );
});
