import { useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { BedDouble, ExternalLink, Globe, MapPin, Ticket } from "lucide-react";
import { AvatarStack } from "../common/AvatarStack";
import { TripDayPicker } from "./TripDayPicker";
import { TripParticipants } from "./TripParticipants";
import { daysBetween, toDateKey, todayKey } from "../../utils/date";
import { tripImage, tripPeople, type Trip, type TripDay, type TripPhase } from "../../utils/trips";
import { getNow } from "../../store/time.store";
import { siteLabel } from "../../utils/format";
import { safeHref } from "../../utils/validation";
import { useIsViewer } from "../../hooks/useIsViewer";
import type { User } from "../../types";

/** The trip's description: three lines, and "Meer" to read the rest when it is longer than that. */
function Description({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [clamped, setClamped] = useState(false);

  // Measured while it is clamped: only a text that does not fit gets the toggle.
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && !open) setClamped(el.scrollHeight > el.clientHeight + 1);
  }, [text, open]);

  return (
    <div className="mt-2 max-w-2xl">
      <p ref={ref} className={`text-[13px] leading-relaxed text-ink-2 ${open ? "" : "line-clamp-3"}`}>{text}</p>
      {(clamped || open) && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="hit-area mt-1 text-[12.5px] font-semibold text-brand-text hover:underline"
        >
          {open ? "Minder" : "Meer"}
        </button>
      )}
    </div>
  );
}

interface TripTicketProps {
  trip: Trip;
  phase: TripPhase;
  users: User[];
  /** Every name the signed-in user can appear under in `participants`. */
  myNames: string[];
  description?: string;
  hotel?: string;
  /** The event's own website; shown on the location line when it is a safe http(s) link. */
  website?: string;
  /** Plays the stamp animation — set right after signing up. */
  justJoined: boolean;
  onToggleDay: (day: TripDay) => void;
  onJoin: () => void;
  onLeave: () => void;
  onManage: () => void;
}

/**
 * The top of Event › Overzicht: the same ticket as in the Agenda, now as the
 * page header. Tapping a day signs you up for that day or off it; the stub
 * counts down, says the trip is underway, or how long ago it was.
 */
export function TripTicket({
  trip, phase, users, myNames, description, hotel, website, justJoined,
  onToggleDay, onJoin, onLeave, onManage,
}: TripTicketProps) {
  const viewer = useIsViewer();
  const image = tripImage(trip);
  const websiteUrl = safeHref(website);
  const today = todayKey();
  const firstKey = toDateKey(trip.days[0].date);
  const lastKey = toDateKey(trip.days[trip.days.length - 1].date);

  const isMine = (p: string) => myNames.includes(p);
  const myDays = trip.days.filter((d) => d.ev.participants.some(isMine));
  const going = myDays.length > 0;
  const year = trip.days[0].date.getFullYear();
  const when = `${trip.dateRange}${year !== getNow().getFullYear() ? ` ${year}` : ""}`;
  const eventType = trip.days.find((d) => d.ev.event_type)?.ev.event_type ?? null;
  const summary = [
    eventType === "gathering" ? "Feestje" : eventType === "concert" ? "Concert" : trip.hasCon ? "Con" : "Reis",
    trip.days.length === 1 ? "1 dag" : `${trip.days.length} dagen`,
    trip.isHotel ? "hotel" : null,
  ].filter(Boolean).join(" · ");

  // One avatar per person, not per name they happen to be signed up under (see utils/people.ts).
  const participants = tripPeople(trip, users).map((person) => person.name).sort((a, b) => Number(isMine(b)) - Number(isMine(a)));
  const others = participants.filter((p) => !isMine(p)).length;
  const verb = phase === "past" ? "waren er" : "gaan mee";
  const crewText = going
    ? others === 0 ? `Alleen jij` : `Jij en ${others} ${others === 1 ? "ander" : "anderen"}`
    : participants.length === 0 ? "Nog niemand aangemeld" : `${participants.length} ${verb}`;

  const dayNumber = trip.days.findIndex((d) => toDateKey(d.date) === today) + 1;
  const count = {
    upcoming: { big: String(daysBetween(today, firstKey)), small: daysBetween(today, firstKey) === 1 ? "dag te gaan" : "dagen te gaan" },
    live: { big: "Nu", small: trip.days.length > 1 && dayNumber > 0 ? `bezig, dag ${dayNumber} van ${trip.days.length}` : "bezig" },
    past: { big: String(daysBetween(lastKey, today)), small: daysBetween(lastKey, today) === 1 ? "dag geleden" : "dagen geleden" },
  }[phase];
  const stamp = phase === "past" ? (going ? "Geweest" : "Gemist") : phase === "live" ? "Erbij" : "Je gaat mee";

  return (
    <article className="ticket-notch grid grid-cols-[minmax(0,1fr)] overflow-hidden rounded-hero border-2 border-outline bg-surface md:grid-cols-[200px_minmax(0,1fr)_168px] lg:grid-cols-[240px_minmax(0,1fr)_188px]">
      {/* ── Cover ── */}
      <div className={`relative overflow-hidden bg-hero md:h-auto md:min-h-[280px] ${image ? "h-28 sm:h-52" : "h-16"}`}>
        {image && <img src={image} alt="" className={`absolute inset-0 h-full w-full object-cover ${phase === "past" ? "saturate-50" : ""}`} />}
      </div>

      {/* ── Body ── */}
      <div className="flex min-w-0 flex-col gap-3.5 p-4 sm:p-5 md:px-6">
        <p className="font-mono text-xs font-semibold text-ink">
          {when} <span className="font-normal text-ink-3">· {summary}</span>
        </p>

        <div>
          <h1 className="font-display text-[32px] font-black uppercase leading-[0.92] tracking-[0.01em] text-ink [text-wrap:balance] sm:text-[40px] md:text-[30px] lg:text-[38px]">
            {trip.title}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-2">
            {trip.location && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(trip.location)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hit-area flex min-w-0 items-center gap-1.5 hover:text-ink hover:underline"
              >
                <MapPin size={14} className="shrink-0" /> <span className="truncate">{trip.location}</span>
              </a>
            )}
            {hotel && <span className="flex min-w-0 items-center gap-1.5"><BedDouble size={14} className="shrink-0" /> <span className="truncate">{hotel}</span></span>}
            {websiteUrl && (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={`Website van het evenement: ${websiteUrl}`}
                aria-label={`Website van het evenement, ${siteLabel(websiteUrl)} (opent in een nieuw tabblad)`}
                className="hit-area flex min-w-0 items-center gap-1.5 hover:text-ink hover:underline"
              >
                <Globe size={14} className="shrink-0" /> <span className="truncate">{siteLabel(websiteUrl)}</span>
                <ExternalLink size={12} className="shrink-0" aria-hidden />
              </a>
            )}
          </p>
          {description && <Description text={description} />}
        </div>

        {/* Days: tap one to sign up for it or off it, until it has passed */}
        {trip.days.length > 1 && (
          <TripDayPicker trip={trip} myNames={myNames} readOnly={phase === "past" || viewer} onToggleDay={onToggleDay} />
        )}

        <div className="mt-auto flex flex-wrap items-center gap-2.5">
          <TripParticipants trip={trip} users={users} myNames={myNames} phase={phase} onManage={viewer ? undefined : onManage}>
          <AvatarStack names={participants} />
          <span className="min-w-0 flex-1 text-[13px] text-ink-2">
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
          <span className="font-display text-[60px] font-black leading-[0.8] text-ink md:text-[96px]">{count.big}</span>
          <span className="pb-0.5 text-[13px] leading-tight text-ink-2">{count.small}</span>
        </div>

        {/* The stamp is for what is over or under way: before the trip the checked day cards and "Jij en 3 anderen" already say it. */}
        {phase !== "upcoming" && (going || phase === "past") && (
          <motion.span
            aria-hidden
            initial={justJoined ? { scale: 1.8, rotate: -24, opacity: 0 } : false}
            animate={{ scale: 1, rotate: -12, opacity: 1 }}
            transition={{ type: "spring", stiffness: 520, damping: 22 }}
            className={`pointer-events-none shrink-0 rounded-lg border-[2.5px] bg-surface/80 px-2 pb-0.5 pt-1 text-center font-display text-[18px] font-black uppercase leading-[0.9] md:mr-1 md:mt-auto md:self-end md:text-[22px] ${
              going ? "border-brand-text text-brand-text" : "border-ink-3 text-ink-3"
            }`}
          >
            {stamp === "Je gaat mee" ? <>Je gaat<br />mee</> : stamp}
          </motion.span>
        )}

        {/* Multi-day trips sign up per day (see the day boxes); only a single day needs a button. */}
        {phase !== "past" && trip.days.length === 1 && !viewer && (
          <div className="flex flex-col items-end gap-2 md:items-stretch">
            {going ? (
              <button
                type="button"
                onClick={onLeave}
                className="hit-area text-[12.5px] font-semibold text-ink-3 transition-colors hover:text-ink hover:underline md:text-left"
              >
                Toch niet? Afmelden
              </button>
            ) : (
              <button type="button" onClick={onJoin} className="btn-primary px-4">
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
