import { Link } from "react-router-dom";
import { BedDouble, ChevronRight, MapPin, Ticket, X } from "lucide-react";
import { UserAvatar } from "../../common/UserAvatar";
import { TripPlanList } from "./TripPlanList";
import { daysBetween, toDateKey, todayKey } from "../../../utils/date";
import { dayShort, monthShort } from "../../../utils/multiDay";
import { tripImage, type Trip } from "../../../utils/trips";
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
  const names = [...trip.participants].sort((a, b) => Number(myNames.includes(b)) - Number(myNames.includes(a)));
  const findUser = (p: string) => users.find((u) => u.name === p || u.discord_username === p || u.aliases?.includes(p));
  const others = names.filter((p) => !myNames.includes(p)).length;

  return (
    <article className="overflow-hidden rounded-[14px] border-2 border-outline bg-surface">
      <div
        className="relative h-32 bg-[#0F1519]"
        style={cover ? undefined : { backgroundImage: "radial-gradient(circle, rgb(var(--cyan) / .45) 1.4px, transparent 1.8px)", backgroundSize: "12px 12px" }}
      >
        {cover && <img src={cover} alt="" className="h-full w-full object-cover" />}
        <button
          type="button"
          onClick={onClose}
          aria-label="Sluiten"
          className="absolute left-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F1519]/70 text-white transition-colors hover:bg-[#0F1519]"
        >
          <X size={15} />
        </button>
        {going && (
          <span className="absolute -bottom-3.5 right-3 -rotate-[9deg] rounded-lg border-[2.5px] border-brand-text bg-surface px-2.5 pt-1 font-display text-[20px] font-black uppercase leading-none text-brand-text">
            Je gaat mee
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3.5 p-4">
        <div>
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.05em] text-ink">
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
            {trip.location && <span className="flex min-w-0 items-center gap-1.5"><MapPin size={13} className="shrink-0" /><span className="truncate">{trip.location}</span></span>}
            {hotel && <span className="flex min-w-0 items-center gap-1.5"><BedDouble size={13} className="shrink-0" /><span className="truncate">{hotel}</span></span>}
          </p>
        </div>

        {trip.days.length > 1 && (
          <div className="grid grid-cols-3 gap-1.5">
            {trip.days.map(({ ev, date }) => (
              <Link
                key={ev.id}
                to={routes.trip.view(trip.id, "overview", ev.id)}
                className={`min-w-0 rounded-[9px] border-1.5 border-line px-1 py-1.5 text-center transition-colors hover:border-ink-3 ${
                  ev.has_con === false ? "bg-hatch-surface" : "bg-surface"
                }`}
              >
                <span className="block font-mono text-[10px] uppercase leading-none tracking-[0.06em] text-ink-3">
                  {dayShort(date)} {monthShort(date)}
                </span>
                <span className="block font-display text-[22px] font-extrabold leading-none text-ink">{date.getDate()}</span>
                <span className="mt-0.5 block truncate text-[10.5px] leading-none text-ink-2">
                  {ev.has_con === false ? "Reisdag" : `${ev.participants.length} mee`}
                </span>
              </Link>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2.5">
          {names.length > 0 && (
            <span className="flex -space-x-1.5">
              {names.slice(0, 6).map((p) => {
                const u = findUser(p);
                return <UserAvatar key={p} name={u?.name ?? p} user={u} className="h-7 w-7 text-[10px] !border-surface" />;
              })}
            </span>
          )}
          <span className="text-[13px] text-ink-2">
            {going
              ? others === 0 ? "Alleen jij" : `Jij en ${others} ${others === 1 ? "ander" : "anderen"}`
              : names.length === 0 ? "Nog niemand aangemeld" : `${names.length} gaan mee`}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {going ? (
            <button type="button" onClick={onLeave} className="text-[13px] font-semibold text-ink-3 hover:text-ink hover:underline">
              Toch niet? Afmelden
            </button>
          ) : (
            <button type="button" onClick={onJoin} className="btn-primary h-11 px-4 text-[14px]">
              <Ticket size={16} />
              Ik ga mee
            </button>
          )}
          <button type="button" onClick={onManage} className="text-[13px] font-semibold text-brand-text hover:underline">
            Anderen aanmelden
          </button>
        </div>

        <div>
          <p className="section-label">Gepland</p>
          <TripPlanList trip={trip} rides={rides} meals={meals} past={false} />
        </div>

        <Link
          to={routes.trip.view(trip.id)}
          className="flex items-center justify-between rounded-[10px] border-1.5 border-line px-3 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:border-ink-3"
        >
          Naar de trip
          <ChevronRight size={15} className="text-ink-3" />
        </Link>
      </div>
    </article>
  );
}
