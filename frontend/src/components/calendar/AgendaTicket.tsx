import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BedDouble, Globe, MapPin, Ticket, Utensils } from "lucide-react";
import { AvatarStack } from "../common/AvatarStack";
import { InfoChip } from "../common/InfoChip";
import { TripDayPicker } from "../trip/TripDayPicker";
import { TripSheet } from "../trip/TripSheet";
import { TripParticipants } from "../trip/TripParticipants";
import { daysBetween, toDateKey, todayKey } from "../../utils/date";
import { tripImage, tripInfo, tripPeople, type Trip, type TripDay } from "../../utils/trips";
import { mapsUrl, siteLabel } from "../../utils/format";
import { safeHref } from "../../utils/validation";
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
  // A trip of several days asks which days; a single day is just a button.
  const [pickingDays, setPickingDays] = useState(false);
  const multiDay = trip.days.length > 1;
  const today = todayKey();
  const firstKey = toDateKey(trip.days[0].date);
  const daysUntil = daysBetween(today, firstKey);
  const isLive = daysUntil <= 0;

  const isMine = (p: string) => myNames.includes(p);
  const myDays = trip.days.filter((d) => d.ev.participants.some(isMine));
  const going = myDays.length > 0;
  const hotel = trip.days.map((d) => d.ev.hotel_location).find(Boolean);
  const info = tripInfo(trip);
  const websiteUrl = safeHref(info.website);
  const description = info.description?.trim();
  const eventType = trip.days.find((d) => d.ev.event_type)?.ev.event_type ?? null;
  const mealIds = new Set(meals.map((m) => m.linked_event_id).filter(Boolean));
  const hasMeal = trip.days.some((d) => mealIds.has(d.ev.id));
  const year = trip.days[0].date.getFullYear();
  const when = `${trip.dateRange}${year !== getNow().getFullYear() ? ` ${year}` : ""}`;

  const summary = [
    eventType === "gathering" ? "Feestje" : eventType === "concert" ? "Concert" : trip.hasCon ? "Con" : "Reis",
    trip.days.length === 1 ? "1 dag" : `${trip.days.length} dagen`,
    trip.isHotel ? "hotel" : null,
  ].filter(Boolean).join(" · ");

  // One avatar per person, not per name they happen to be signed up under (see utils/people.ts).
  const participants = tripPeople(trip, users).map((person) => person.name).sort((a, b) => Number(isMine(b)) - Number(isMine(a)));
  const others = participants.filter((p) => !isMine(p)).length;
  const crewText = going
    ? others === 0 ? "Alleen jij" : `Jij en ${others} ${others === 1 ? "ander" : "anderen"}`
    : participants.length === 0 ? "Nog niemand aangemeld" : `${participants.length} gaan mee`;

  return (
    <article className="ticket-notch grid grid-cols-[minmax(0,1fr)] overflow-hidden rounded-hero border-2 border-outline bg-surface md:grid-cols-[200px_minmax(0,1fr)_168px] lg:grid-cols-[240px_minmax(0,1fr)_188px]">
      {/* ── Cover ── */}
      <Link
        to={routes.trip.view(trip.id)}
        draggable={false}
        aria-label={`Open ${trip.title}`}
        className={`relative block overflow-hidden bg-hero md:h-auto md:min-h-[300px] ${image ? "h-40 sm:h-52" : "h-14 sm:h-16"}`}
      >
        {image ? (
          <img src={image} alt="" draggable={false} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span aria-hidden className="absolute inset-0 flex items-center justify-center bg-hero text-hero-ink/40">
            <Ticket size={32} />
          </span>
        )}
      </Link>

      {/* ── Body ── */}
      <div className="flex min-w-0 flex-col gap-3.5 p-4 sm:p-5 md:px-6">
        <p className="font-mono text-xs font-semibold text-ink">
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
          {(trip.location || hotel || websiteUrl || hasMeal) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {trip.location && <InfoChip icon={<MapPin size={14} />} href={mapsUrl(trip.location)}>{trip.location}</InfoChip>}
              {websiteUrl && (
                <InfoChip
                  icon={<Globe size={14} />}
                  href={websiteUrl}
                  external
                  title={`Website van het evenement: ${websiteUrl}`}
                  ariaLabel={`Website van het evenement, ${siteLabel(websiteUrl)} (opent in een nieuw tabblad)`}
                >
                  Website
                </InfoChip>
              )}
              {hasMeal && <InfoChip icon={<Utensils size={14} />}>Activiteit gepland</InfoChip>}
              {/* Last: a hotel's name is the longest chip, and in the middle it pushed the website onto a line of its own. */}
              {hotel && <InfoChip icon={<BedDouble size={14} />}>{hotel}</InfoChip>}
            </div>
          )}
        </div>

        {/* A taste of the event; the days to sign up for are on the event page. */}
        {description && <p className="line-clamp-3 text-[13px] leading-relaxed text-ink-2">{description}</p>}

        <div className="mt-auto flex items-center gap-2.5">
          <TripParticipants trip={trip} users={users} myNames={myNames}>
          <AvatarStack names={participants} />
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
            {isLive ? "bezig" : daysUntil === 1 ? "dag" : "dagen"}
          </span>
        </div>

        {going && (
          // The sticker is also the way off: one tap signs you off every day of the trip.
          <motion.button
            type="button"
            onClick={onLeave}
            aria-label={`Je gaat mee naar ${trip.title}. Tik om je af te melden.`}
            title="Tik om je af te melden"
            initial={justJoined ? { scale: 1.8, rotate: -24, opacity: 0 } : false}
            animate={{ scale: 1, rotate: -12, opacity: 1 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 520, damping: 22 }}
            className="shrink-0 cursor-pointer rounded-lg md:absolute border-[2.5px] border-brand-text bg-surface/80 px-2 pb-0.5 pt-1 text-center font-display text-[18px] font-black uppercase leading-[0.9] text-brand-text md:right-4 md:top-[130px] md:text-[22px]"
          >
            Je gaat
            <br />
            mee
          </motion.button>
        )}

        {/* One day signs up at once; several days ask which ones first (the sheet below), so nobody is signed up for days they never chose. Signing off is the sticker above. */}
        {!going && (
          <div className="flex flex-col items-end gap-2 md:items-stretch">
            <button type="button" onClick={multiDay ? () => setPickingDays(true) : onJoin} className="btn-primary px-4">
              <Ticket size={16} />
              Ik ga mee
            </button>
          </div>
        )}
      </div>
      {multiDay && (
        <TripSheet
          open={pickingDays}
          onClose={() => setPickingDays(false)}
          title="Aanmelden"
          subtitle={trip.title}
          footer={
            <button type="button" onClick={() => setPickingDays(false)} className="btn-primary w-full px-4">
              Klaar
            </button>
          }
        >
          <TripDayPicker trip={trip} myNames={myNames} onToggleDay={onToggleDay} />
        </TripSheet>
      )}
    </article>
  );
}
