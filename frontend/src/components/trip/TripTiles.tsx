import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BedDouble, Camera, Car, ChevronRight, CloudSun, FileText, Info, Plus, Sparkles, Ticket as TicketIcon, Trash2, Upload, Utensils, Wallet } from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { Segmented } from "../common/Segmented";
import { StartTicketVote, TicketBars, TicketBoughtView, TicketVoteView, choiceLabel } from "./TicketVote";
import { AvatarStack } from "../common/AvatarStack";
import { OutlierRow } from "./Outliers";
import { Button } from "../common/Button";
import { StoryUploadButton } from "../story/StoryUploadButton";
import { DayChips } from "./DayChips";
import { TripSheet } from "./TripSheet";
import { TripMealSheet } from "./TripMealSheet";
import { WeatherCard, ClimateAverageCard, WeatherSkeleton } from "../event/WeatherCard";
import { EventPractical } from "../event/EventPractical";
import { EventLinks } from "../event/EventLinks";
import { TileText, TilePill, TileValue, TripTile } from "./TripTile";
import { useRouteAction } from "../../hooks/useRouteAction";
import { useIsViewer } from "../../hooks/useIsViewer";
import { useMyNames } from "../../hooks/useUsers";
import { activityCount, mealCategory } from "../../utils/mealCategory";
import { useEventWeather } from "../../hooks/useEventWeather";
import { useUsers } from "../../hooks/useUsers";
import { myTicketChoice, tallyTicketPoll } from "../../utils/ticketPoll";
import { routes } from "../../config/routes";
import { getNow } from "../../store/time.store";
import { parseEventDate, splitDateTime, toDateKey, todayKey } from "../../utils/date";
import { dayShort } from "../../utils/multiDay";
import { rideHow } from "../../utils/transportView";
import { practicalTopics } from "../../utils/practicalInfo";
import { countOf, formatAmount, formatBytes, formatTicketSaleStart } from "../../utils/format";
import { defaultTripDayId, tripGaps, tripInfo, tripMeals, tripRides, tripOutliers, tripRoomGaps, type Trip, type TripDay, type TripPhase } from "../../utils/trips";
import { groupPeople } from "../../utils/people";
import { useLocalTicketsStore } from "../../store/localTickets.store";
import type { LocalTicket } from "../../utils/localTickets";
import type { CalendarEvent, Cosplay, Expense, HotelRoom, Meal, Ride, StoryDaySummary, TicketPoll, User } from "../../types";

/** The small "add" button in the corner of a tile: the standard blue, as a 36 px square like every icon button. */
const ADD_BUTTON_CLASS = "icon-btn bg-brand text-brand-on hover:bg-brand hover:text-brand-on hover:opacity-90";

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
              {detail && <span className="shrink-0 text-[12px] font-medium text-ink-3">{detail}</span>}
            </li>
          );
        })}
      </ul>
    </TripSheet>
  );
}

/* ── Vervoer ─────────────────────────────────────────────────────────────── */

export function TransportTile({ trip, phase, rides, meals, myNames, wide }: { trip: Trip; phase: TripPhase; rides: Ride[]; meals: Meal[]; myNames: string[]; wide?: boolean }) {
  const { data: users = [] } = useUsers();
  const tripRideList = tripRides(rides, meals, trip).filter((r) => r.direction !== "Restaurant");
  const gaps = tripGaps(trip, rides, meals, users).transport;
  const isMine = sameName(myNames);
  const mine = (direction: Ride["direction"]) => tripRideList.find((r) => r.direction === direction && [r.driver, ...r.passengers].some(isMine));
  /** One line per direction: who you ride with and when, or that there is no ride yet. */
  const legs: { label: string; ride: Ride | undefined }[] = [
    ...(phase === "live" ? [] : [{ label: "Heen", ride: mine("Inbound") }]),
    { label: "Terug", ride: mine("Outbound") },
  ];
  const how = (r: Ride) => rideHow(r, isMine);

  const missingBack = gaps.filter((g) => g.items.includes("Terug")).length;
  const missing = phase === "live" ? missingBack : gaps.length;
  // Who the pill counts: once the trip is on, only the ones still without a ride back.
  const missingPeople = (phase === "live" ? gaps.filter((g) => g.items.includes("Terug")) : gaps).map((g) => ({
    name: g.name,
    detail: phase === "live" ? "Terug" : g.items.join(" & "),
  }));
  const [missingOpen, setMissingOpen] = useState(false);

  return (
    <>
    <TripTile
      icon={Car}
      label="Vervoer"
      to={routes.trip.view(trip.id, "transport")}
      sheet
      size={phase === "past" && !wide ? "small" : "wide"}
      pill={
        phase !== "past" &&
        missing > 0 && (
          // The tile itself links to the transport sheet; the pill opens the names instead.
          <button
            type="button"
            aria-label={`Bekijk wie nog geen rit heeft (${missing})`}
            onClick={() => setMissingOpen(true)}
            className="hit-area shrink-0 cursor-pointer rounded-full transition-opacity hover:opacity-80"
          >
            <TilePill>{missing} zonder rit</TilePill>
          </button>
        )
      }
    >
      <TileValue>{tripRideList.length === 0 ? "Geen ritten" : `${tripRideList.length} ${tripRideList.length === 1 ? "rit" : "ritten"}`}</TileValue>
      {phase !== "past" && (
        <ul className="-mx-1.5 divide-y divide-line">
          {legs.map(({ label, ride }) => (
            <li key={label} className="grid grid-cols-[62px_minmax(0,1fr)_auto] items-center gap-2 px-1.5 py-1.5 text-[12.5px]">
              <span className="font-mono text-xs text-ink-3">{label}</span>
              <span className={`min-w-0 truncate font-semibold ${ride ? "text-ink" : "text-warn"}`}>{ride ? how(ride) : "Nog geen rit"}</span>
              {ride && <span className="shrink-0 text-ink-3">{dayTime(ride.departure_time)}</span>}
            </li>
          ))}
        </ul>
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
export function FoodTile({ trip, phase, meals, myNames, wide }: { trip: Trip; phase: TripPhase; meals: Meal[]; myNames: string[]; wide?: boolean }) {
  const viewer = useIsViewer();
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
  const { data: users = [] } = useUsers();
  const missingNames = phase === "upcoming" ? tripGaps(trip, [], meals, users).food : [];
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
      size={phase === "past" && !wide ? "small" : "wide"}
      pill={
        missing > 0 && (
          // The count alone doesn't say who, so it opens the names.
          <button
            type="button"
            onClick={() => setMissingOpen(true)}
            aria-label={`Bekijk wie nergens bij zit (${missing})`}
            className="hit-area shrink-0 rounded-full transition-opacity hover:opacity-80"
          >
            <TilePill>{missing} nergens bij</TilePill>
          </button>
        )
      }
      action={
        phase !== "past" && !viewer && (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            title="Activiteit toevoegen"
            aria-label="Activiteit toevoegen"
            className={ADD_BUTTON_CLASS}
          >
            <Plus size={16} />
          </button>
        )
      }
    >
      <TileValue>
        {all.length === 0 ? "Niets gepland" : phase === "live" && ahead[0] ? nextMealText(ahead[0].time) : activityCount(all.length)}
      </TileValue>
      {phase !== "past" && shown.length > 0 && (
        <ul className="-mx-1.5 divide-y divide-line">
          {shown.map((m) => (
            <li key={m.id}>
              <Link
                to={routes.meal.view(m.id)}
                className="grid grid-cols-[62px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-1.5 py-1.5 text-[12.5px] transition-colors hover:bg-sunken"
              >
                <span className="pt-px font-mono text-xs text-ink-3">{dayTime(m.time)}</span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink">{m.meal_name}</span>
                  <span className="block text-ink-3">
                    {mealCategory(m).has_signup
                      ? `${groupPeople(m.participants, users).length} mee, ${m.participants.some(isMine) ? "jij ook" : "jij nog niet"}`
                      : mealCategory(m).name}
                  </span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-ink-3" />
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

export function RoomsTile({ trip, phase, rooms, users, myNames, wide }: { trip: Trip; phase: TripPhase; rooms: HotelRoom[]; users: User[]; myNames: string[]; wide?: boolean }) {
  const isMine = sameName(myNames);
  const myRoom = rooms.find((r) => r.occupants.some(isMine));
  const roommates = myRoom?.occupants.filter((o) => !isMine(o)) ?? [];
  const missing = phase === "upcoming" ? tripRoomGaps(trip, rooms, users).length : 0;
  const numbered = (r: HotelRoom) => (r.room_number ? `Kamer ${r.room_number}` : "een kamer");

  return (
    <TripTile
      icon={BedDouble}
      label="Hotel"
      to={routes.trip.view(trip.id, "rooms")}
      sheet
      size={phase === "past" && !wide ? "small" : "wide"}
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
              {r.occupants.length === 0 ? <span className="text-[12px] text-ink-3">leeg</span> : <AvatarStack names={r.occupants} size="xs" max={3} />}
            </span>
          ))}
          {rooms.length > 5 && <span className="self-center font-mono text-[12px] text-ink-3">+{rooms.length - 5}</span>}
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

export function CosplayTile({ trip, cosplays, myNames, wide }: { trip: Trip; cosplays: Cosplay[]; myNames: string[]; wide?: boolean }) {
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
    <TripTile icon={Sparkles} label="Cosplay" to={routes.trip.view(trip.id, "cosplay")} sheet size={wide ? "wide" : "small"}>
      <TileValue>{list.length}</TileValue>
      <TileText>{list.length === 1 ? "cosplay" : "cosplays"}{mine ? `, jij als ${mine.character_name}` : ""}</TileText>
      {images.length > 0 && (
        <span className="flex min-w-0 items-center gap-1 overflow-hidden">
          {images.map((src, i) => <img key={i} src={src} alt="" className="h-11 w-[34px] shrink-0 rounded-md object-cover" />)}
          {moreCount > 0 && (
            <span className="flex h-11 shrink-0 items-center justify-center rounded-md bg-sunken px-1.5 font-mono text-[12px] text-ink-3">
              +{moreCount}
            </span>
          )}
        </span>
      )}
    </TripTile>
  );
}

/* ── Foto's ──────────────────────────────────────────────────────────────── */

// The upload button wears the same blue `icon-btn` as the "+" on the Activiteiten tile (ADD_BUTTON_CLASS).
const UPLOAD_BUTTON_CLASS = ADD_BUTTON_CLASS;

/**
 * Opens the story viewer directly on the most relevant day instead of
 * linking to a separate Foto's page — there's little here that the tile
 * doesn't already show. Also carries its own upload button (same one as the
 * trip ticket's camera icon) so adding a photo doesn't require hunting for
 * it elsewhere.
 */
export function PhotosTile({ trip, phase, summary, onOpenDay, uploadDayId }: { trip: Trip; phase: TripPhase; summary?: Record<string, StoryDaySummary>; onOpenDay: (dayId: string) => void; uploadDayId?: string }) {
  const viewer = useIsViewer();
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
      action={uploadDayId && !viewer && <StoryUploadButton eventDayId={uploadDayId} className={UPLOAD_BUTTON_CLASS} />}
      size={phase === "past" ? "full" : "wide"}
    >
      {total === 0 ? (
        <>
          <TileValue>Foto's</TileValue>
          <TileText>
            {phase === "past" ? "Er zijn geen foto's toegevoegd." : "Nog geen foto's. Voeg de eerste toe."}
          </TileText>
        </>
      ) : (
        <>
          <TileValue>{phase === "live" && todayCount > 0 ? `${todayCount} vandaag` : countOf(total, "foto", "foto's")}</TileValue>
          <TileText>
            {trip.days.length > 1
              ? perDay.filter((x) => (x.s?.photo_count ?? 0) > 0).map((x) => `${x.s!.photo_count} op ${dayShort(x.day.date)}`).join(", ")
              : `${total} in de story`}
          </TileText>
          <span className="flex items-center gap-1.5">
            {previews.map((x) => (
              <button
                key={x.day.ev.id}
                type="button"
                onClick={() => onOpenDay(x.day.ev.id)}
                aria-label={`Foto's van ${dayShort(x.day.date)}`}
                className="relative rounded-md"
              >
                <img src={x.s!.preview_url} alt="" className="h-16 w-12 rounded-md object-cover" />
              </button>
            ))}
          </span>
        </>
      )}
    </TripTile>
  );
}

/* ── Uitgaven ────────────────────────────────────────────────────────────── */

/** The trip's shared costs, your share of them and how much of that you still have to pay. */
export function tripCosts(trip: Trip, expenses: Expense[], myNames: string[]) {
  const isMine = sameName(myNames);
  const ids = new Set(trip.eventIds);
  const list = expenses.filter((e) => e.linked_event_id && ids.has(e.linked_event_id));
  const total = list.reduce((s, e) => s + e.amount, 0);
  const myShares = list.flatMap((e) => e.shares.filter((s) => isMine(s.participant)).map((s) => ({ s, e })));
  const myTotal = myShares.reduce((sum, x) => sum + x.s.amount, 0);
  const open = myShares.filter((x) => x.s.status === "pending" && !isMine(x.e.paid_by)).reduce((sum, x) => sum + x.s.amount, 0);
  return { list, total, myTotal, open };
}

export function ExpensesTile({ trip, phase, expenses, myNames, wide }: { trip: Trip; phase: TripPhase; expenses: Expense[]; myNames: string[]; wide?: boolean }) {
  const { list, total, myTotal, open } = tripCosts(trip, expenses, myNames);

  return (
    <TripTile
      icon={Wallet}
      label="Kosten"
      to={routes.tripExpenses.view(trip.id)}
      size={wide || (phase === "past" && open > 0) ? "wide" : "small"}
      pill={open > 0 && <TilePill>Open</TilePill>}
    >
      <TileValue>{list.length === 0 ? "Geen kosten" : open > 0 && phase === "past" ? `${formatAmount(open)} open` : formatAmount(total)}</TileValue>
      <TileText>
        {list.length === 0
          ? "Gedeelde kosten van deze trip komen hier."
          : open > 0 ? `Jouw deel ${formatAmount(myTotal)}, nog te betalen ${formatAmount(open)}` : `Jouw deel ${formatAmount(myTotal)}`}
      </TileText>
    </TripTile>
  );
}

/* ── Weer ────────────────────────────────────────────────────────────────── */

function DayForecast({ trip, day }: { trip: Trip; day: TripDay }) {
  const { data } = useEventWeather(trip.location, toDateKey(day.date), trip.locationCoords);
  const max = data ? Math.round(data.kind === "forecast" ? data.data.temp_max : data.data.temp_max_avg) : null;
  return (
    <span className="flex flex-col items-center gap-0.5 text-[12px] text-ink-3">
      <span className="text-[17px] leading-none" aria-hidden>{data?.data.icon ?? "·"}</span>
      <b className="font-semibold tabular-nums text-ink">{max === null ? "–" : `${max}°`}</b>
      {dayShort(day.date)}
    </span>
  );
}

export function WeatherTile({ trip, onOpen, wide }: { trip: Trip; onOpen: () => void; wide?: boolean }) {
  const days = trip.days.filter((d) => toDateKey(d.date) >= todayKey()).slice(0, 4);
  const first = days[0] ?? trip.days[0];
  const { data } = useEventWeather(trip.location, toDateKey(first.date), trip.locationCoords);

  return (
    <TripTile icon={CloudSun} label="Weer" onOpen={onOpen} size={wide ? "wide" : "small"}>
      <TileValue>
        {data ? `${Math.round(data.kind === "forecast" ? data.data.temp_max : data.data.temp_max_avg)}°` : "–"}
      </TileValue>
      <TileText>{data ? `${data.kind === "climate" ? "Gemiddeld, " : ""}${data.data.description.toLowerCase()}` : "Nog geen weer"}</TileText>
      {days.length > 1 && (
        <span className="grid grid-cols-4 gap-1">
          {days.map((d) => <DayForecast key={d.ev.id} trip={trip} day={d} />)}
        </span>
      )}
    </TripTile>
  );
}

/** Opened from the Weer tile — a day picker (multi-day trips) plus that day's forecast. */
export function WeatherSheet({ open, onClose, trip }: { open: boolean; onClose: () => void; trip: Trip }) {
  const [dayId, setDayId] = useState(() => defaultTripDayId(trip));
  const day = trip.days.find((d) => d.ev.id === dayId) ?? trip.days[0];
  const { data: weather, isLoading } = useEventWeather(trip.location, toDateKey(day.date), trip.locationCoords);

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

/* ── Info ───────────────────────────────────────────────────────────── */

export function hasPracticalInfo(info: CalendarEvent): boolean {
  return !!(
    info.special_instructions || info.parking_info || info.what_to_bring || info.locker_info ||
    info.website || info.ticket_url || info.ticket_sale_start || (info.ticket_types?.length ?? 0) > 0
  );
}

export function PracticalTile({ info, trip, onOpen, wide }: { info: CalendarEvent; trip: Trip; onOpen: () => void; wide?: boolean }) {
  const { data: users = [] } = useUsers();
  const topics = practicalTopics(info, tripOutliers(trip, users).length > 0);

  return (
    <TripTile icon={Info} label="Info" onOpen={onOpen} size={wide ? "wide" : "small"}>
      {info.special_instructions ? (
        <>
          <span><TilePill>Let op</TilePill></span>
          <TileText><span className="line-clamp-2">{info.special_instructions}</span></TileText>
        </>
      ) : (
        // Without a "Let op" the tile is a count, and the topics say what is inside. With one, the warning is the
        // answer and a list of the sheet's headings under it would only repeat what opening the tile shows.
        <>
          <TileValue>{topics.length}</TileValue>
          <TileText>{topics.length === 1 ? "onderwerp" : "onderwerpen"}</TileText>
          {topics.length > 0 && (
            <TileText><span className="line-clamp-2 break-words">{topics.join(", ").replace(/^./, (c) => c.toUpperCase())}</span></TileText>
          )}
        </>
      )}
    </TripTile>
  );
}

/** Opened from the Info tile — who's missing which days, plus parking, tickets and the rest. */
export function PracticalSheet({ open, onClose, info, trip }: { open: boolean; onClose: () => void; info: CalendarEvent; trip: Trip }) {
  const { data: users = [] } = useUsers();
  const outliers = tripOutliers(trip, users);
  const hasRows = !!(info.special_instructions || info.parking_info || info.what_to_bring || info.locker_info);
  const hasLinks = !!(info.website || info.ticket_url || info.ticket_sale_start || (info.ticket_types?.length ?? 0) > 0);
  return (
    <TripSheet open={open} onClose={onClose} title="Info" subtitle={trip.title}>
      {outliers.length > 0 && (
        <div className="pb-4">
          <p className="section-label">Niet alle dagen erbij</p>
          <ul className="mt-1.5 space-y-1">
            {outliers.map((o) => (
              <OutlierRow key={o.name} outlier={o} />
            ))}
          </ul>
        </div>
      )}
      {outliers.length > 0 && (hasRows || hasLinks) && <div className="h-px bg-line" />}
      {hasRows && <EventPractical event={info} bare />}
      {hasRows && hasLinks && <div className="h-px bg-line" />}
      {hasLinks && <EventLinks event={info} bare />}
    </TripSheet>
  );
}

/* ── Mijn ticket (this device only) ─────────────────────────────────────── */

const TICKET_MAX_BYTES = 15 * 1024 * 1024; // 15 MB — generous for a screenshot or a vendor PDF
const TICKET_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

/** Answers "have I saved my ticket for this trip" — nothing here ever leaves the device. */
export function TicketTile({ trip, poll, onOpen, wide }: { trip: Trip; poll?: TicketPoll | null; onOpen: () => void; wide?: boolean }) {
  const items = useLocalTicketsStore((s) => s.items);
  const hydrate = useLocalTicketsStore((s) => s.hydrate);
  const { data: users = [] } = useUsers();
  const { myNames } = useMyNames();
  const viewer = useIsViewer();
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  const count = items.filter((t) => t.eventId === trip.id).length;

  // A vote that is open takes the whole row; once the tickets are bought it is a small line again.
  if (poll?.status === "open") {
    const tally = tallyTicketPoll(poll, users);
    const myChoice = myTicketChoice(poll, myNames);
    const sale = tripInfo(trip).ticket_sale_start;
    return (
      <TripTile
        icon={TicketIcon}
        label="Tickets"
        onOpen={onOpen}
        size="full"
        pill={myChoice === null && !viewer ? <TilePill>Stem mee</TilePill> : undefined}
      >
        <TicketBars tally={tally} myChoice={myChoice} />
        <TileText>
          {tally.voters.length === 0 ? "Nog niemand gestemd" : `${tally.voters.length} ${tally.voters.length === 1 ? "persoon" : "mensen"} gestemd`}
          {sale && ` · verkoop start ${formatTicketSaleStart(sale)}`}
        </TileText>
      </TripTile>
    );
  }

  if (poll?.status === "bought") {
    const mine = choiceLabel(poll, myTicketChoice(poll, myNames));
    return (
      <TripTile icon={TicketIcon} label="Tickets" onOpen={onOpen} size={wide ? "wide" : "small"}>
        <TileValue>Gekocht</TileValue>
        <TileText>
          Door {poll.buyer}
          {mine && ` · jij koos: ${mine}`}
          {count > 0 && ` · ${count} ${count === 1 ? "bestand" : "bestanden"} op dit toestel`}
        </TileText>
      </TripTile>
    );
  }

  return (
    <TripTile icon={TicketIcon} label="Ticket" onOpen={onOpen} size={wide ? "wide" : "small"}>
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
            <FileText size={16} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-semibold text-ink">{ticket.fileName || "Ticket"}</span>
          <span className="block text-[12px] text-ink-3">{formatBytes(ticket.size)} · tik om te bekijken</span>
        </span>
      </a>
      {confirming ? (
        <span className="flex shrink-0 items-center gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => setConfirming(false)}>
            Annuleren
          </Button>
          <Button size="sm" variant="danger" onClick={onDelete}>
            Verwijderen
          </Button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label="Verwijderen"
          className="icon-btn"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}

/** Opened from the Mijn ticket tile. Everything here lives in this browser's IndexedDB only —
 * never uploaded, never visible to anyone else, not even an admin. That also means it doesn't
 * follow you to another device, and a browser can clear it on its own (low on storage, a
 * reinstall) — worth keeping a copy somewhere else too for anything you can't afford to lose. */
export function TicketSheet({
  open, onClose, trip, poll, mineOnly,
}: { open: boolean; onClose: () => void; trip: Trip; poll?: TicketPoll | null; /** Only the member's own ticket, no vote (the Hub's shortcut). */ mineOnly?: boolean }) {
  const { me } = useMyNames();
  const [view, setView] = useState<"buy" | "mine">("buy");
  // The vote is a view of its own when there is one, or when an admin can start one.
  const hasBuy = !mineOnly && (!!poll || !!me?.is_admin);
  const shown = hasBuy ? view : "mine";
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
    <TripSheet open={open} onClose={onClose} title={hasBuy ? "Tickets" : "Mijn ticket"} subtitle={trip.title}>
      {hasBuy && (
        <Segmented
          label="Tickets"
          fill
          className="mb-4"
          options={[{ value: "buy", label: poll?.status === "bought" ? "Gekocht" : "Kopen" }, { value: "mine", label: "Mijn ticket" }]}
          value={shown}
          onChange={setView}
        />
      )}
      {shown === "buy" && (
        <>
          {poll?.status === "open" && <TicketVoteView trip={trip} poll={poll} />}
          {poll?.status === "bought" && <TicketBoughtView trip={trip} poll={poll} />}
          {!poll && <StartTicketVote trip={trip} />}
        </>
      )}
      {shown === "mine" && (
        <>
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

          {error && <p className="mb-4 text-sm text-bad" role="alert">{error}</p>}

          {mine.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-3">Nog geen ticket toegevoegd.</p>
          ) : (
            <div className="space-y-2">
              {mine.map((t) => (
                <TicketRow key={t.id} ticket={t} onDelete={() => remove(t.id)} />
              ))}
            </div>
          )}
        </>
      )}
    </TripSheet>
  );
}
