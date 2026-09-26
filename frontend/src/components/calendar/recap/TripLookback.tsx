import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { BedDouble, Camera, ChevronRight, MapPin, X } from "lucide-react";
import { UserAvatar } from "../../common/UserAvatar";
import { StoryViewer } from "../../story/StoryViewer";
import { TripPlanList } from "./TripPlanList";
import { getStoryPhotos } from "../../../services/stories.service";
import { QUERY_KEYS, STALE_TIME } from "../../../constants";
import { daysBetween, toDateKey, todayKey } from "../../../utils/date";
import { dayShort, monthShort } from "../../../utils/multiDay";
import { tripImage, type Trip } from "../../../utils/trips";
import { routes } from "../../../config/routes";
import type { Meal, Ride, StoryDaySummary, User } from "../../../types";

interface TripLookbackProps {
  trip: Trip;
  /** A single day of the trip to focus on, or null for all days. */
  dayKey: string | null;
  onDayChange: (dayKey: string | null) => void;
  onClose: () => void;
  myNames: string[];
  users: User[];
  rides: Ride[];
  meals: Meal[];
  storySummary: Record<string, StoryDaySummary> | undefined;
}

const DAYS = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
const GRID_SIZE = 6;

function ago(lastDayKey: string): string {
  const n = daysBetween(lastDayKey, todayKey());
  if (n < 14) return n === 1 ? "gisteren" : `${n} dagen geleden`;
  if (n < 60) return `${Math.round(n / 7)} weken geleden`;
  if (n < 330) return `${Math.round(n / 30.4)} maanden geleden`;
  const years = Math.round(n / 365);
  return years === 1 ? "een jaar geleden" : `${years} jaar geleden`;
}

/**
 * Recap › a past trip: stamped Geweest or Gemist, how many went, the story
 * photos (per day or all days), who was there and the rides and dinners.
 * Tapping a photo opens that day's story at that photo.
 */
export function TripLookback({ trip, dayKey, onDayChange, onClose, myNames, users, rides, meals, storySummary }: TripLookbackProps) {
  const [viewer, setViewer] = useState<{ dayId: string; index: number } | null>(null);

  const photoQueries = useQueries({
    queries: trip.eventIds.map((id) => ({
      queryKey: QUERY_KEYS.storyDay(id),
      queryFn: () => getStoryPhotos(id),
      staleTime: STALE_TIME,
      enabled: (storySummary?.[id]?.photo_count ?? 0) > 0,
    })),
  });

  const went = trip.participants.some((p) => myNames.includes(p));
  const cover = tripImage(trip);
  const lastKey = toDateKey(trip.days[trip.days.length - 1].date);
  const photoCount = (id: string) => storySummary?.[id]?.photo_count ?? 0;
  const totalPhotos = trip.eventIds.reduce((sum, id) => sum + photoCount(id), 0);
  const nights = trip.isHotel ? trip.days.length - 1 : 0;
  const location = trip.location;
  const hotel = trip.days.map((d) => d.ev.hotel_location).find(Boolean);

  const photos = trip.days.flatMap((d, i) =>
    toDateKey(d.date) === dayKey || !dayKey
      ? (photoQueries[i]?.data ?? []).map((photo, index) => ({ photo, dayId: d.ev.id, index }))
      : [],
  );
  const shownTotal = dayKey
    ? photoCount(trip.days.find((d) => toDateKey(d.date) === dayKey)?.ev.id ?? "")
    : totalPhotos;
  const loading = photoQueries.some((q) => q.isLoading);
  const tiles = photos.slice(0, GRID_SIZE);
  const names = [...trip.participants].sort((a, b) => Number(myNames.includes(b)) - Number(myNames.includes(a)));
  const findUser = (p: string) => users.find((u) => u.name === p || u.discord_username === p || u.aliases?.includes(p));

  const stats = [
    { value: trip.participants.length, label: went ? "waren erbij" : "gingen" },
    { value: totalPhotos, label: totalPhotos === 1 ? "foto" : "foto's" },
    nights > 0
      ? { value: nights, label: nights === 1 ? "hotelnacht" : "hotelnachten" }
      : { value: trip.days.length, label: trip.days.length === 1 ? "dag" : "dagen" },
  ];

  return (
    <article className="overflow-hidden rounded-[14px] border-2 border-outline bg-surface">
      {/* ── Cover with stamp ── */}
      <div className="relative h-32 bg-[#0F1519]">
        {cover && (
          <img src={cover} alt="" className={`h-full w-full object-cover ${went ? "" : "opacity-60 grayscale"}`} />
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Sluiten"
          className="absolute left-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F1519]/70 text-white transition-colors hover:bg-[#0F1519]"
        >
          <X size={15} />
        </button>
        <span
          className={`absolute -bottom-3.5 right-3 -rotate-[9deg] rounded-lg border-[2.5px] bg-surface px-2.5 pt-1 font-display text-[20px] font-black uppercase leading-none ${
            went ? "border-brand-text text-brand-text" : "border-dashed border-ink-3 text-ink-3"
          }`}
        >
          {went ? "Geweest" : "Gemist"}
        </span>
      </div>

      <div className="flex flex-col gap-3.5 p-4">
        <div>
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.05em] text-ink">
            {trip.dateRange} {trip.days[0].date.getFullYear()} <span className="font-normal text-ink-3">· {ago(lastKey)}</span>
          </p>
          <Link
            to={routes.trip.view(trip.id)}
            className="mt-1.5 block font-display text-[30px] font-black uppercase leading-[0.92] text-ink decoration-2 underline-offset-4 [text-wrap:balance] hover:underline"
          >
            {trip.title}
          </Link>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-2">
            {location && <span className="flex min-w-0 items-center gap-1.5"><MapPin size={13} className="shrink-0" /><span className="truncate">{location}</span></span>}
            {hotel && <span className="flex min-w-0 items-center gap-1.5"><BedDouble size={13} className="shrink-0" /><span className="truncate">{hotel}</span></span>}
          </p>
        </div>

        <dl className="grid grid-cols-3 rounded-[10px] border-1.5 border-line">
          {stats.map((s, i) => (
            <div key={s.label} className={`flex flex-col-reverse px-2.5 py-2 ${i > 0 ? "border-l-1.5 border-line" : ""}`}>
              <dt className="text-[11.5px] text-ink-2">{s.label}</dt>
              <dd className="font-display text-[26px] font-extrabold leading-none tabular-nums text-ink">{s.value}</dd>
            </div>
          ))}
        </dl>

        {/* Day filter for the photos */}
        {trip.days.length > 1 && (
          <div className="grid grid-cols-3 gap-1.5">
            {trip.days.map(({ ev, date }) => {
              const key = toDateKey(date);
              const on = dayKey === key;
              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => onDayChange(on ? null : key)}
                  aria-pressed={on}
                  className={`min-w-0 rounded-[9px] px-1 py-1.5 text-center transition-colors ${
                    on ? "border-2 border-outline" : "border-1.5 border-line hover:border-ink-3"
                  } ${ev.has_con === false ? "bg-hatch-surface" : "bg-surface"}`}
                >
                  <span className="block font-mono text-[10px] uppercase leading-none tracking-[0.06em] text-ink-3">
                    {dayShort(date)} {monthShort(date)}
                  </span>
                  <span className="block font-display text-[22px] font-extrabold leading-none text-ink">{date.getDate()}</span>
                  <span className="mt-0.5 flex items-center justify-center gap-1 text-[10.5px] leading-none text-ink-2">
                    <Camera size={10} /> {photoCount(ev.id)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Photos */}
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <p className="section-label">Foto's{dayKey ? ` · ${DAYS[new Date(`${dayKey}T00:00:00`).getDay()]}` : ""}</p>
            {dayKey && (
              <button type="button" onClick={() => onDayChange(null)} className="section-label !text-brand-text hover:underline">
                Alle dagen
              </button>
            )}
          </div>
          {shownTotal === 0 ? (
            <p className="text-[13px] text-ink-3">
              Geen foto's{dayKey ? " van deze dag" : ""}. Voeg ze toe op het tabblad{" "}
              <Link to={routes.trip.view(trip.id, "photos")} className="font-semibold text-brand-text hover:underline">Foto's</Link>.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {loading && tiles.length === 0
                ? Array.from({ length: Math.min(GRID_SIZE, shownTotal) }).map((_, i) => (
                    <span key={i} className="aspect-square animate-pulse rounded-lg bg-sunken" />
                  ))
                : tiles.map(({ photo, dayId, index }, i) => {
                    const isLast = i === tiles.length - 1 && shownTotal > tiles.length;
                    return (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => setViewer({ dayId, index })}
                        aria-label={`Foto ${i + 1} van ${shownTotal}`}
                        className="group relative aspect-square overflow-hidden rounded-lg bg-sunken"
                      >
                        <img src={photo.image_url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.04]" />
                        {isLast ? (
                          <span className="absolute inset-0 flex items-center justify-center bg-[#0F1519]/65 font-display text-[24px] font-extrabold text-white">
                            +{shownTotal - tiles.length + 1}
                          </span>
                        ) : (
                          <UserAvatar name={photo.uploaded_by} className="absolute bottom-1 left-1 h-5 w-5 text-[8px] !border-[#0F1519]/40" />
                        )}
                      </button>
                    );
                  })}
            </div>
          )}
        </div>

        {/* Who */}
        {names.length > 0 && (
          <div>
            <p className="section-label mb-1.5">{went ? "Wie er mee waren" : "Wie er gingen"}</p>
            <div className="flex flex-wrap gap-1.5">
              {names.map((p) => {
                const u = findUser(p);
                const mine = myNames.includes(p);
                return (
                  <span
                    key={p}
                    className={`inline-flex items-center gap-1.5 rounded-full border-1.5 py-0.5 pl-0.5 pr-2 text-[12px] font-medium ${
                      mine ? "border-outline text-ink" : "border-line text-ink-2"
                    }`}
                  >
                    <UserAvatar name={u?.name ?? p} user={u} className="h-[18px] w-[18px] text-[8px] !border-0" />
                    {mine ? "Jij" : u?.name ?? p}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* What you did */}
        <div>
          <p className="section-label">{went ? "Wat we deden" : "Wat ze deden"}</p>
          <TripPlanList trip={trip} rides={rides} meals={meals} dayKey={dayKey} past />
        </div>

        <Link
          to={routes.trip.view(trip.id)}
          className="flex items-center justify-between rounded-[10px] border-1.5 border-line px-3 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:border-ink-3"
        >
          Naar de trip
          <ChevronRight size={15} className="text-ink-3" />
        </Link>
      </div>

      <StoryViewer
        eventDayId={viewer?.dayId ?? ""}
        open={viewer !== null}
        initialIndex={viewer?.index ?? 0}
        onClose={() => setViewer(null)}
      />
    </article>
  );
}
