import { TripParticipants } from "../../trip/TripParticipants";
import { Link } from "react-router-dom";
import { BedDouble, ChevronRight, MapPin, Ticket, X } from "lucide-react";
import { AvatarStack } from "../../common/AvatarStack";
import { TripPlanList } from "./TripPlanList";
import { daysBetween, toDateKey, todayKey } from "../../../utils/date";
import { dayShort, monthShort } from "../../../utils/multiDay";
import { tripImage, tripPeople, type Trip } from "../../../utils/trips";
import { groupPeople } from "../../../utils/people";
import { routes } from "../../../config/routes";
import type { Meal, Ride, User } from "../../../types";

interface TripPreviewProps {
  trip: Trip;
  onClose: () => void;
  myNames: string[];
  users: User[];
  rides: Ride[];
  meals: Meal[];
  onJoin: () => void;
  onLeave: () => void;
  onManage: () => void;
}

/** Recap › an upcoming (or ongoing) trip: countdown, days, who's going, sign-up and what's planned. */
export function TripPreview({ trip, onClose, myNames, users, rides, meals, onJoin, onLeave, onManage }: TripPreviewProps) {
  const cover = tripImage(trip);
  const daysUntil = daysBetween(todayKey(), toDateKey(trip.days[0].date));
  const going = trip.participants.some((p) => myNames.includes(p));
  const hotel = trip.days.map((d) => d.ev.hotel_location).find(Boolean);
  const names = tripPeople(trip, users).map((person) => person.name).sort((a, b) => Number(myNames.includes(b)) - Number(myNames.includes(a)));
  const others = names.filter((p) => !myNames.includes(p)).length;

  return (
    <article className="overflow-hidden rounded-hero border-2 border-outline bg-surface">
      <div
        className="relative h-32 bg-hero"
        style={cover ? undefined : { backgroundImage: "radial-gradient(circle, rgb(var(--cyan) / .45) 1.4px, transparent 1.8px)", backgroundSize: "12px 12px" }}
      >
        {cover && <img src={cover} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />}
        <button
          type="button"
          onClick={onClose}
          aria-label="Sluiten"
          className="hit-area absolute left-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-hero/70 text-hero-ink transition-colors hover:bg-hero"
        >
          <X size={16} />
        </button>
        {going && (
          <span className="absolute -bottom-3.5 right-3 -rotate-[9deg] rounded-lg border-[2.5px] border-brand-text bg-surface px-2.5 pt-1 font-display text-[20px] font-black uppercase leading-none text-brand-text">
            Je gaat mee
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3.5 p-4">
        <div>
          <p className="font-mono text-xs font-semibold text-ink">
            {trip.dateRange}{" "}
            <span className="font-normal text-ink-3">
              · {daysUntil <= 0 ? "nu bezig" : daysUntil === 1 ? "morgen" : `over ${daysUntil} dagen`}
            </span>
          </p>
          <Link
            to={routes.trip.view(trip.id)}
            className="mt-1.5 block font-display text-[30px] font-black uppercase leading-[0.92] text-ink decoration-2 underline-offset-4 [text-wrap:balance] hover:underline"
          >
            {trip.title}
          </Link>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-2">
            {trip.location && <span className="flex min-w-0 items-center gap-1.5"><MapPin size={14} className="shrink-0" /><span className="truncate">{trip.location}</span></span>}
            {hotel && <span className="flex min-w-0 items-center gap-1.5"><BedDouble size={14} className="shrink-0" /><span className="truncate">{hotel}</span></span>}
          </p>
        </div>

        {trip.days.length > 1 && (
          <div className="grid grid-cols-3 gap-1.5">
            {trip.days.map(({ ev, date }) => (
              <Link
                key={ev.id}
                to={routes.trip.view(trip.id, "overview", ev.id)}
                className={`min-w-0 rounded-lg border-1.5 border-line px-1 py-1.5 text-center transition-colors hover:border-ink-3 ${
                  ev.has_con === false ? "bg-hatch-surface" : "bg-surface"
                }`}
              >
                <span className="block font-mono text-xs leading-none text-ink-3">
                  {dayShort(date)} {monthShort(date)}
                </span>
                <span className="block font-display text-[22px] font-extrabold leading-none text-ink">{date.getDate()}</span>
                <span className="mt-0.5 block truncate text-[12px] leading-none text-ink-2">
                  {ev.has_con === false ? "Reisdag" : `${groupPeople(ev.participants ?? [], users).length} mee`}
                </span>
              </Link>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2.5">
          <TripParticipants trip={trip} users={users} myNames={myNames} onManage={onManage}>
          <AvatarStack names={names} />
          <span className="text-[13px] text-ink-2">
            {going
              ? others === 0 ? "Alleen jij" : `Jij en ${others} ${others === 1 ? "ander" : "anderen"}`
              : names.length === 0 ? "Nog niemand aangemeld" : `${names.length} gaan mee`}
          </span>
          </TripParticipants>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {going ? (
            <button type="button" onClick={onLeave} className="hit-area text-[13px] font-semibold text-ink-3 hover:text-ink hover:underline">
              Toch niet? Afmelden
            </button>
          ) : (
            <button type="button" onClick={onJoin} className="btn-primary h-11 px-4 text-[14px]">
              <Ticket size={16} />
              Ik ga mee
            </button>
          )}
          <button type="button" onClick={onManage} className="btn-primary min-h-10 px-3.5 text-xs">
            Anderen aanmelden
          </button>
        </div>

        <div>
          <p className="section-label">Gepland</p>
          <TripPlanList trip={trip} rides={rides} meals={meals} past={false} />
        </div>

        <Link
          to={routes.trip.view(trip.id)}
          className="flex items-center justify-between rounded-xl border-1.5 border-line px-3 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:border-ink-3"
        >
          Naar de trip
          <ChevronRight size={16} className="text-ink-3" />
        </Link>
      </div>
    </article>
  );
}
