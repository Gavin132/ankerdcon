import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BedDouble, MapPin, PartyPopper, Ticket, Utensils } from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { TripDayPicker } from "../trip/TripDayPicker";
import { TripParticipants } from "../trip/TripParticipants";
import { daysBetween, toDateKey, todayKey } from "../../utils/date";
import { tripImage, type Trip, type TripDay } from "../../utils/trips";
import { routes } from "../../config/routes";
import { getNow } from "../../store/time.store";
import type { Meal, User } from "../../types";

interface AgendaTicketProps {
  trip: Trip;
  meals: Meal[];
  users: User[];
  /** Every name the signed-in user can appear under in `participants`. */
  myNames: string[];
  /** Plays the stamp animation — set right after signing up. */
  justJoined: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onToggleDay: (day: TripDay) => void;
}

/**
 * One upcoming trip in the Agenda's ticket stack: the event image on the
 * cover, the details in the middle and a tear-off stub with the countdown and
 * the sign-up. The image sits on the left from md and across the top on
 * phones; the stub sits on the right from md and along the bottom on phones.
 * The notches where the stub tears off come from `.ticket-notch`.
 */
export function AgendaTicket({ trip, meals, users, myNames, justJoined, onJoin, onLeave, onToggleDay }: AgendaTicketProps) {
  const image = tripImage(trip);
  const today = todayKey();
  const firstKey = toDateKey(trip.days[0].date);
  const daysUntil = daysBetween(today, firstKey);
  const isLive = daysUntil <= 0;

  const isMine = (p: string) => myNames.includes(p);
  const myDays = trip.days.filter((d) => d.ev.participants.some(isMine));
  const going = myDays.length > 0;
  const hotel = trip.days.map((d) => d.ev.hotel_location).find(Boolean);
  const isParty = trip.days.some((d) => d.ev.is_party);
  const mealIds = new Set(meals.map((m) => m.linked_event_id).filter(Boolean));
  const hasMeal = trip.days.some((d) => mealIds.has(d.ev.id));
  const year = trip.days[0].date.getFullYear();
  const when = `${trip.dateRange}${year !== getNow().getFullYear() ? ` ${year}` : ""}`;

  const summary = [
    isParty ? "Feest" : trip.hasCon ? "Con" : "Reis",
    trip.days.length === 1 ? "1 dag" : `${trip.days.length} dagen`,
    trip.isHotel ? "hotel" : null,
  ].filter(Boolean).join(" · ");

  const participants = [...trip.participants].sort((a, b) => Number(isMine(b)) - Number(isMine(a)));
  const findUser = (p: string) => users.find((u) => u.name === p || u.discord_username === p || u.aliases?.includes(p));
  const others = participants.filter((p) => !isMine(p)).length;
  const crewText = going
    ? others === 0 ? "Alleen jij" : `Jij en ${others} ${others === 1 ? "ander" : "anderen"}`
    : participants.length === 0 ? "Nog niemand aangemeld" : `${participants.length} gaan mee`;

  return (
    <article className="ticket-notch grid grid-cols-[minmax(0,1fr)] overflow-hidden rounded-[14px] border-2 border-outline bg-surface md:grid-cols-[200px_minmax(0,1fr)_168px] lg:grid-cols-[240px_minmax(0,1fr)_188px]">
      {/* ── Cover ── */}
      <Link
        to={routes.trip.view(trip.id)}
        draggable={false}
        aria-label={`Open ${trip.title}`}
        className="relative block h-40 overflow-hidden bg-[#0F1519] sm:h-52 md:h-auto md:min-h-[300px]"
      >
        {image ? (
          <img src={image} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span
            className="absolute inset-0 flex flex-col justify-end gap-1 p-4 text-[#E6F0F3]"
            style={{
              backgroundImage: "radial-gradient(circle, rgb(var(--cyan) / .45) 1.4px, transparent 1.8px)",
              backgroundSize: "12px 12px",
            }}
          >
            <span className="font-display text-[34px] font-black uppercase leading-[0.9] [text-wrap:balance] md:text-[40px]">
              {trip.title}
            </span>
          </span>
        )}
      </Link>

      {/* ── Body ── */}
      <div className="flex min-w-0 flex-col gap-3.5 p-4 sm:p-5 md:px-6">
        <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.06em] text-ink">
          {when} <span className="font-normal text-ink-3">· {summary}</span>
        </p>

        <div>
          <Link
            to={routes.trip.view(trip.id)}
            draggable={false}
            className="block font-display text-[32px] font-black uppercase leading-[0.92] tracking-[0.01em] text-ink decoration-2 underline-offset-4 [text-wrap:balance] hover:underline sm:text-[40px] md:text-[30px] lg:text-[36px]"
          >
            {trip.title}
          </Link>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-2">
            {trip.location && (
              <span className="flex min-w-0 items-center gap-1.5"><MapPin size={13} className="shrink-0" /> <span className="truncate">{trip.location}</span></span>
            )}
            {hotel && <span className="flex min-w-0 items-center gap-1.5"><BedDouble size={13} className="shrink-0" /> <span className="truncate">{hotel}</span></span>}
            {hasMeal && <span className="flex items-center gap-1.5"><Utensils size={13} className="shrink-0" /> Etentje gepland</span>}
            {isParty && <span className="flex items-center gap-1.5"><PartyPopper size={13} className="shrink-0" /> Feestje</span>}
          </p>
        </div>

        {/* Days of a multi-day trip — tap one to sign up for it or off it */}
        {trip.days.length > 1 && <TripDayPicker trip={trip} myNames={myNames} onToggleDay={onToggleDay} />}

        <div className="mt-auto flex items-center gap-2.5">
          <TripParticipants trip={trip} users={users} myNames={myNames}>
          {participants.length > 0 && (
            <span className="flex -space-x-1.5">
              {participants.slice(0, 6).map((p) => {
                const u = findUser(p);
                return <UserAvatar key={p} name={u?.name ?? p} user={u} className="h-7 w-7 text-[10px] !border-surface" />;
              })}
              {participants.length > 6 && (
                <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-sunken font-mono text-[10px] font-semibold text-ink-2">
                  +{participants.length - 6}
                </span>
              )}
            </span>
          )}
          <span className="text-[13px] text-ink-2">
            {crewText}
            {going && myDays.length < trip.days.length && (
              <span className="text-ink-3"> · jij {myDays.length} van {trip.days.length} dagen</span>
            )}
          </span>
          </TripParticipants>
        </div>
      </div>

      {/* ── Stub ── */}
      <div className="relative flex min-h-[118px] flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t-2 border-dashed border-line px-5 py-3 md:h-auto md:flex-col md:flex-nowrap md:items-stretch md:border-l-2 md:border-t-0 md:py-5">
        <div className="flex items-end gap-2.5 md:flex-col md:items-start md:gap-1">
          <span className="font-display text-[60px] font-black leading-[0.8] text-ink md:text-[96px]">
            {isLive ? "Nu" : daysUntil}
          </span>
          <span className="pb-0.5 text-[13px] leading-tight text-ink-2">
            {isLive ? "bezig" : daysUntil === 1 ? "dag te gaan" : "dagen te gaan"}
          </span>
        </div>

        {going && (
          <motion.span
            aria-hidden
            initial={justJoined ? { scale: 1.8, rotate: -24, opacity: 0 } : false}
            animate={{ scale: 1, rotate: -12, opacity: 1 }}
            transition={{ type: "spring", stiffness: 520, damping: 22 }}
            className="pointer-events-none shrink-0 rounded-lg md:absolute border-[2.5px] border-brand-text bg-surface/80 px-2 pb-0.5 pt-1 text-center font-display text-[18px] font-black uppercase leading-[0.9] text-brand-text md:right-4 md:top-[130px] md:text-[22px]"
          >
            Je gaat
            <br />
            mee
          </motion.span>
        )}

        {/* Multi-day trips sign up per day (see the day boxes); only a single day needs a button. */}
        {trip.days.length === 1 && (
          <div className="flex flex-col items-end gap-2 md:items-stretch">
            {going ? (
              <button
                type="button"
                onClick={onLeave}
                className="text-[12.5px] font-semibold text-ink-3 transition-colors hover:text-ink hover:underline md:text-left"
              >
                Toch niet? Afmelden
              </button>
            ) : (
              <button type="button" onClick={onJoin} className="btn-primary h-11 px-4 text-[14px]">
                <Ticket size={16} />
                Ik ga mee
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
