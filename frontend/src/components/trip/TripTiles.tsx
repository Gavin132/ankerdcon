import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, BedDouble, Camera, Car, ChevronRight, CloudSun, FileText, Plus, Sparkles, Ticket as TicketIcon, Trash2, Upload, Utensils, Wallet } from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { StoryUploadButton } from "../story/StoryUploadButton";
import { DayChips } from "./DayChips";
import { TripSheet } from "./TripSheet";
import { TripMealSheet } from "./TripMealSheet";
import { WeatherCard, ClimateAverageCard, WeatherSkeleton } from "../event/WeatherCard";
import { EventPractical } from "../event/EventPractical";
import { EventLinks } from "../event/EventLinks";
import { TileText, TilePill, TileValue, TripTile } from "./TripTile";
import { useRouteAction } from "../../hooks/useRouteAction";
import { activityCount, mealCategory } from "../../utils/mealCategory";
import { useEventWeather } from "../../hooks/useEventWeather";
import { useUsers } from "../../hooks/useUsers";
import { routes } from "../../config/routes";
import { getNow } from "../../store/time.store";
import { parseEventDate, splitDateTime, toDateKey, todayKey } from "../../utils/date";
import { dayShort } from "../../utils/multiDay";
import { formatCurrency } from "../../utils/format";
import { defaultTripDayId, tripGaps, tripInfo, tripMeals, tripRides, tripOutliers, tripRoomGaps, type Trip, type TripDay, type TripPhase } from "../../utils/trips";
import { useLocalTicketsStore } from "../../store/localTickets.store";
import type { LocalTicket } from "../../utils/localTickets";
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

/** "Straks 21:45" for a meal later today, otherwise just the day and time ("zo 21:45"). */
export function nextMealText(value: string): string {
  const [dateKey, time] = splitDateTime(value);
  return dateKey === toDateKey(getNow()) ? `Straks ${time}` : dayTime(value);
}

/** The names behind a tile's "N zonder …" pill, each with what they still lack (a ride back, a meal). */
function MissingPeopleSheet({
  open,
  onClose,
  trip,
  title,
  intro,
  people,
}: {
  open: boolean;
  onClose: () => void;
  trip: Trip;
  title: string;
  intro: string;
  people: { name: string; detail?: string }[];
}) {
  const { data: users = [] } = useUsers();
  return (
    <TripSheet open={open} onClose={onClose} title={title} subtitle={`${trip.title} · ${people.length} ${people.length === 1 ? "persoon" : "personen"}`}>
      <p className="mb-3 text-[12.5px] text-ink-3">{intro}</p>
      <ul className="-mx-2 divide-y divide-line">
        {people.map(({ name, detail }) => {
          const u = findUser(users, name);
          return (
            <li key={name} className="flex items-center gap-3 px-2 py-2.5">
              <UserAvatar name={u?.name ?? name} user={u} className="h-9 w-9 shrink-0 text-xs" />
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">{u?.name ?? name}</span>
              {detail && <span className="shrink-0 text-[11.5px] font-medium text-ink-3">{detail}</span>}
            </li>
          );
        })}
      </ul>
    </TripSheet>
  );
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
  // Who the pill counts: once the trip is on, only the ones still without a ride back.
  const missingPeople = (phase === "live" ? gaps.filter((g) => g.items.includes("Terug")) : gaps).map((g) => ({
    name: g.name,
    detail: phase === "live" ? "Terug" : g.items.join(" & "),
  }));
  const [missingOpen, setMissingOpen] = useState(false);
  const bars = phase === "live"
    ? [["Terug", total - missingBack] as const]
    : [["Heen", total - gaps.filter((g) => g.items.includes("Heen")).length] as const, ["Terug", total - missingBack] as const];

  return (
    <>
    <TripTile
      icon={Car}
      label="Vervoer"
      to={routes.trip.view(trip.id, "transport")}
      sheet
      size={phase === "past" ? "small" : "wide"}
      pill={
        phase !== "past" &&
        missing > 0 && (
          // The tile itself links to the transport sheet; the pill opens the names instead.
          <span
            role="button"
            tabIndex={0}
            aria-label={`Bekijk wie nog geen rit heeft (${missing})`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMissingOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                setMissingOpen(true);
              }
            }}
            className="shrink-0 cursor-pointer rounded-full transition-opacity hover:opacity-80"
          >
            <TilePill>{missing} zonder rit</TilePill>
          </span>
        )
      }
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
    {/* Outside the tile: it is a link, and a click inside a portalled sheet still bubbles up to it. */}
    <MissingPeopleSheet
      open={missingOpen}
      onClose={() => setMissingOpen(false)}
      trip={trip}
      title="Zonder rit"
      intro={phase === "live" ? "Deze mensen hebben nog geen rit terug." : "Deze mensen doen aan de trip mee, maar hebben nog geen rit heen en/of terug."}
      people={missingPeople}
    />
    </>
  );
}

/* ── Activiteiten (eten, bowlen, groepsfoto, ...) ───────────────────────── */

/** How long after its start a meal still counts as current here — matches
 * MealTodayCard's LINGER_MS on the Hub, so "a meal is over" means the same
 * thing everywhere in the app. */
const MEAL_LINGER_MS = 3 * 60 * 60 * 1000;

/**
 * Answers "what is planned": every activity of the trip, a meal as much as the
 * group photo. Links straight to each one's own detail page
 * (so it has no single `to` of its own — each row is its own link) and, while
 * the trip isn't over, has a "+" for anyone to plan another one.
 */
export function FoodTile({ trip, phase, meals, myNames }: { trip: Trip; phase: TripPhase; meals: Meal[]; myNames: string[] }) {
  const isMine = sameName(myNames);
  const all = tripMeals(meals, trip).sort((a, b) => a.time.localeCompare(b.time));
  const now = getNow().getTime();
  const current = all.filter((m) => {
    const start = new Date(m.time.replace(" ", "T")).getTime();
    return isNaN(start) || now - start < MEAL_LINGER_MS;
  });
  const ahead = current.filter((m) => {
    const start = new Date(m.time.replace(" ", "T")).getTime();
    return isNaN(start) || start >= now;
  });
  const shown = phase === "live" && ahead.length > 0 ? ahead : current;
  const missingNames = phase === "upcoming" ? tripGaps(trip, [], meals).food : [];
  const missing = missingNames.length;
  const [addOpen, setAddOpen] = useState(false);
  const [missingOpen, setMissingOpen] = useState(false);
  // The global search's "Activiteit toevoegen" card lands here with the form open.
  useRouteAction("addMeal", () => {
    if (phase !== "past") setAddOpen(true);
  });

  return (
    <TripTile
      icon={Utensils}
      label="Activiteiten"
      size={phase === "past" ? "small" : "wide"}
      pill={
        missing > 0 && (
          // The count alone doesn't say who, so it opens the names.
          <button
            type="button"
            onClick={() => setMissingOpen(true)}
            aria-label={`Bekijk wie nergens bij zit (${missing})`}
            className="shrink-0 rounded-full transition-opacity hover:opacity-80"
          >
            <TilePill>{missing} nergens bij</TilePill>
          </button>
        )
      }
      action={
        phase !== "past" && (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            title="Activiteit toevoegen"
            aria-label="Activiteit toevoegen"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-1.5 border-outline bg-brand text-brand-on transition-opacity hover:opacity-90"
          >
            <Plus size={15} strokeWidth={2.5} />
          </button>
        )
      }
    >
      <TileValue>
        {all.length === 0 ? "Nog niks gepland" : phase === "live" && ahead[0] ? nextMealText(ahead[0].time) : activityCount(all.length)}
      </TileValue>
      {phase !== "past" && shown.length > 0 && (
        <ul className="-mx-1.5 divide-y divide-line">
          {shown.map((m) => (
            <li key={m.id}>
              <Link
                to={routes.meal.view(m.id)}
                className="grid grid-cols-[62px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-1.5 py-1.5 text-[12.5px] transition-colors hover:bg-sunken"
              >
                <span className="pt-px font-mono text-[11.5px] uppercase text-ink-3">{dayTime(m.time)}</span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink">{m.meal_name}</span>
                  <span className="block text-ink-3">
                    {mealCategory(m).has_signup
                      ? `${m.participants.length} mee, ${m.participants.some(isMine) ? "jij ook" : "jij nog niet"}`
                      : mealCategory(m).name}
                  </span>
                </span>
                <ChevronRight size={14} className="shrink-0 text-ink-3" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <TripMealSheet open={addOpen} onClose={() => setAddOpen(false)} trip={trip} />
      <MissingPeopleSheet
        open={missingOpen}
        onClose={() => setMissingOpen(false)}
        trip={trip}
        title="Nergens bij"
        intro="Deze mensen doen aan de trip mee, maar staan bij geen enkel etentje. Meld ze aan bij een etentje, of plan er een."
        people={missingNames.map((name) => ({ name }))}
      />
    </TripTile>
  );
}

/* ── Hotel ──────────────────────────────────────────────────────────────── */

export function RoomsTile({ trip, phase, rooms, users, myNames }: { trip: Trip; phase: TripPhase; rooms: HotelRoom[]; users: User[]; myNames: string[] }) {
  const isMine = sameName(myNames);
  const myRoom = rooms.find((r) => r.occupants.some(isMine));
  const roommates = myRoom?.occupants.filter((o) => !isMine(o)) ?? [];
  const missing = phase === "upcoming" ? tripRoomGaps(trip, rooms).length : 0;
  const numbered = (r: HotelRoom) => (r.room_number ? `Kamer ${r.room_number}` : "een kamer");

  return (
    <TripTile
      icon={BedDouble}
      label="Hotel"
      to={routes.trip.view(trip.id, "rooms")}
      sheet
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
      {phase !== "past" && tripInfo(trip).hotel_location && (
        <TileText><span className="line-clamp-1">{tripInfo(trip).hotel_location}</span></TileText>
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
  // A "small" (single-column) tile is only wide enough for about 3 of these
  // before the row would run past the card's edge — capped here rather than
  // just visually clipped, so the count on the tile still matches what's
  // actually shown instead of trailing off mid-image.
  const allImages = list.map((c) => c.inspo_images[0]).filter(Boolean);
  const images = allImages.slice(0, 2);
  const moreCount = allImages.length - images.length;

  return (
    <TripTile icon={Sparkles} label="Cosplay" to={routes.trip.view(trip.id, "cosplay")} sheet>
      <TileValue>{list.length}</TileValue>
      <TileText>{list.length === 1 ? "cosplay" : "cosplays"}{mine ? `, jij als ${mine.character_name}` : ""}</TileText>
      {images.length > 0 && (
        <span className="flex min-w-0 items-center gap-1 overflow-hidden">
          {images.map((src, i) => <img key={i} src={src} alt="" className="h-11 w-[34px] shrink-0 rounded-[5px] object-cover" />)}
          {moreCount > 0 && (
            <span className="flex h-11 shrink-0 items-center justify-center rounded-[5px] bg-sunken px-1.5 font-mono text-[10.5px] text-ink-3">
              +{moreCount}
            </span>
          )}
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
      label="Kosten"
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

/* ── Weer ────────────────────────────────────────────────────────────────── */

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

export function WeatherTile({ trip, onOpen }: { trip: Trip; onOpen: () => void }) {
  const days = trip.days.filter((d) => toDateKey(d.date) >= todayKey()).slice(0, 4);
  const first = days[0] ?? trip.days[0];
  const { data } = useEventWeather(trip.location, toDateKey(first.date));

  return (
    <TripTile icon={CloudSun} label="Weer" onOpen={onOpen}>
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

/** Opened from the Weer tile — a day picker (multi-day trips) plus that day's forecast. */
export function WeatherSheet({ open, onClose, trip }: { open: boolean; onClose: () => void; trip: Trip }) {
  const [dayId, setDayId] = useState(() => defaultTripDayId(trip));
  const day = trip.days.find((d) => d.ev.id === dayId) ?? trip.days[0];
  const { data: weather, isLoading } = useEventWeather(trip.location, toDateKey(day.date));

  return (
    <TripSheet open={open} onClose={onClose} title="Weer" subtitle={trip.title}>
      <div className="space-y-3">
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
      </div>
    </TripSheet>
  );
}

/* ── Praktisch ───────────────────────────────────────────────────────────── */

export function hasPracticalInfo(info: CalendarEvent): boolean {
  return !!(
    info.special_instructions || info.parking_info || info.what_to_bring || info.locker_info ||
    info.website || info.ticket_url || info.ticket_sale_start || (info.ticket_types?.length ?? 0) > 0
  );
}

export function PracticalTile({ info, trip, onOpen }: { info: CalendarEvent; trip: Trip; onOpen: () => void }) {
  const topics = [
    info.parking_info && "parkeren",
    info.what_to_bring && "meenemen",
    info.locker_info && "lockers",
    (info.ticket_url || (info.ticket_types?.length ?? 0) > 0) && "tickets",
    info.website && "website",
    tripOutliers(trip).length > 0 && "aanwezigheid",
  ].filter(Boolean) as string[];

  return (
    <TripTile icon={AlertCircle} label="Info" onOpen={onOpen}>
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

const OUTLIER_TEXT = {
  "leaves-early": (days: TripDay[]) => `t/m ${dayShort(days[days.length - 1].date)}`,
  "arrives-late": (days: TripDay[]) => `vanaf ${dayShort(days[0].date)}`,
  "some-days": (days: TripDay[]) => `alleen ${days.map((d) => dayShort(d.date)).join(", ")}`,
};

/** Opened from the Praktisch tile — who's missing which days, plus parking, tickets and the rest. */
export function PracticalSheet({ open, onClose, info, trip }: { open: boolean; onClose: () => void; info: CalendarEvent; trip: Trip }) {
  const outliers = tripOutliers(trip);
  const hasRows = !!(info.special_instructions || info.parking_info || info.what_to_bring || info.locker_info);
  const hasLinks = !!(info.website || info.ticket_url || info.ticket_sale_start || (info.ticket_types?.length ?? 0) > 0);
  return (
    <TripSheet open={open} onClose={onClose} title="Praktisch" subtitle={trip.title}>
      {outliers.length > 0 && (
        <div className="pb-4">
          <p className="text-[12.5px] font-semibold text-ink-2">Niet alle dagen erbij</p>
          <ul className="mt-1.5 space-y-1">
            {outliers.map((o) => (
              <li key={o.name} className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="font-medium text-ink">{o.name}</span>
                <span className="text-ink-3">{OUTLIER_TEXT[o.kind](o.days)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {outliers.length > 0 && (hasRows || hasLinks) && <div className="mb-4 h-px bg-line" />}
      {hasRows && <EventPractical event={info} bare />}
      {hasRows && hasLinks && <div className="my-4 h-px bg-line" />}
      {hasLinks && <EventLinks event={info} bare />}
    </TripSheet>
  );
}

/* ── Mijn ticket (this device only) ─────────────────────────────────────── */

const TICKET_MAX_BYTES = 15 * 1024 * 1024; // 15 MB — generous for a screenshot or a vendor PDF
const TICKET_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Answers "have I saved my ticket for this trip" — nothing here ever leaves the device. */
export function TicketTile({ trip, onOpen }: { trip: Trip; onOpen: () => void }) {
  const items = useLocalTicketsStore((s) => s.items);
  const hydrate = useLocalTicketsStore((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  const count = items.filter((t) => t.eventId === trip.id).length;

  return (
    <TripTile icon={TicketIcon} label="Ticket" onOpen={onOpen}>
      <TileValue>{count > 0 ? `${count} ${count === 1 ? "bestand" : "bestanden"}` : "Geen ticket"}</TileValue>
      <TileText>{count > 0 ? "Alleen op dit toestel opgeslagen" : "Bewaar een foto of PDF van je ticket"}</TileText>
    </TripTile>
  );
}

/** One saved ticket: a thumbnail for an image, an icon for a PDF, tap to open full-screen. */
function TicketRow({ ticket, onDelete }: { ticket: LocalTicket; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const url = useMemo(() => URL.createObjectURL(ticket.blob), [ticket.blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  const isImage = ticket.contentType.startsWith("image/");

  return (
    <div className="flex items-center gap-3 rounded-xl border-1.5 border-line px-3 py-2.5">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        {isImage ? (
          <img src={url} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink-3">
            <FileText size={18} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-semibold text-ink">{ticket.fileName || "Ticket"}</span>
          <span className="block text-[11.5px] text-ink-3">{formatBytes(ticket.size)} · tik om te bekijken</span>
        </span>
      </a>
      {confirming ? (
        <span className="flex shrink-0 items-center gap-1.5">
          <button type="button" onClick={() => setConfirming(false)} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-ink-2 hover:bg-sunken">
            Nee
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg border-2 border-rose-800 bg-rose-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 dark:border-rose-400"
          >
            Verwijder
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label="Verwijderen"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-500/15 dark:hover:text-rose-300"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}

/** Opened from the Mijn ticket tile. Everything here lives in this browser's IndexedDB only —
 * never uploaded, never visible to anyone else, not even an admin. That also means it doesn't
 * follow you to another device, and a browser can clear it on its own (low on storage, a
 * reinstall) — worth keeping a copy somewhere else too for anything you can't afford to lose. */
export function TicketSheet({ open, onClose, trip }: { open: boolean; onClose: () => void; trip: Trip }) {
  const items = useLocalTicketsStore((s) => s.items);
  const add = useLocalTicketsStore((s) => s.add);
  const remove = useLocalTicketsStore((s) => s.remove);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const mine = items.filter((t) => t.eventId === trip.id).sort((a, b) => b.createdAt - a.createdAt);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    const isAllowed = file.type.startsWith("image/") || file.type === "application/pdf";
    if (!isAllowed) {
      setError("Kies een foto (JPG, PNG, WebP) of een PDF.");
      return;
    }
    if (file.size > TICKET_MAX_BYTES) {
      setError(`Te groot: ${formatBytes(file.size)}. Maximaal 15 MB.`);
      return;
    }
    const result = await add(trip.id, file);
    if (!result) {
      setError("Opslaan is niet gelukt op dit toestel (mogelijk privénavigatie of te weinig opslagruimte).");
    }
    if (fileInput.current) fileInput.current.value = "";
  }

  return (
    <TripSheet open={open} onClose={onClose} title="Mijn ticket" subtitle={trip.title}>
      <div className="mb-4 flex items-start gap-2.5 rounded-xl border-1.5 border-line bg-sunken px-3.5 py-3 text-xs leading-relaxed text-ink-2">
        <TicketIcon size={14} className="mt-0.5 shrink-0 text-ink-3" />
        <p>Alleen op dit toestel opgeslagen — niet in de cloud, niet zichtbaar voor anderen (ook niet voor beheerders).</p>
      </div>

      <input
        ref={fileInput}
        id="ticket-file"
        type="file"
        accept={TICKET_ACCEPT}
        className="sr-only"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <label
        htmlFor="ticket-file"
        className="mb-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-1.5 border-dashed border-line px-4 py-4 text-sm font-semibold text-ink transition-colors hover:border-ink-3"
      >
        <Upload size={16} className="text-ink-3" />
        Ticket toevoegen (foto of PDF)
      </label>

      {error && <p className="mb-4 text-sm text-rose-700 dark:text-rose-300" role="alert">{error}</p>}

      {mine.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-3">Nog geen ticket toegevoegd.</p>
      ) : (
        <div className="space-y-2">
          {mine.map((t) => (
            <TicketRow key={t.id} ticket={t} onDelete={() => remove(t.id)} />
          ))}
        </div>
      )}
    </TripSheet>
  );
}
