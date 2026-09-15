import { motion } from "framer-motion";
import { BedDouble, Check, MapPin, Share2, Ticket } from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { StoryUploadButton } from "../story/StoryUploadButton";
import { daysBetween, toDateKey, todayKey } from "../../utils/date";
import { dayShort, monthShort } from "../../utils/multiDay";
import { tripImage, type Trip, type TripDay, type TripPhase } from "../../utils/trips";
import { getNow } from "../../store/time.store";
import type { User } from "../../types";

interface TripTicketProps {
  trip: Trip;
  phase: TripPhase;
  users: User[];
  /** Every name the signed-in user can appear under in `participants`. */
  myNames: string[];
  description?: string;
  hotel?: string;
  /** The trip day photos can be added to right now, if any. */
  uploadDayId?: string;
  /** Plays the stamp animation — set right after signing up. */
  justJoined: boolean;
  onToggleDay: (day: TripDay) => void;
  onJoin: () => void;
  onLeave: () => void;
  onManage: () => void;
  onShare: () => void;
}

/**
 * The top of Event › Overzicht: the same ticket as in the Agenda, now as the
 * page header. Tapping a day signs you up for that day or off it; the stub
 * counts down, says the trip is underway, or how long ago it was.
 */
export function TripTicket({
  trip, phase, users, myNames, description, hotel, uploadDayId, justJoined,
  onToggleDay, onJoin, onLeave, onManage, onShare,
}: TripTicketProps) {
  const image = tripImage(trip);
  const today = todayKey();
  const firstKey = toDateKey(trip.days[0].date);
  const lastKey = toDateKey(trip.days[trip.days.length - 1].date);

  const isMine = (p: string) => myNames.includes(p);
  const myDays = trip.days.filter((d) => d.ev.participants.some(isMine));
  const going = myDays.length > 0;
  const year = trip.days[0].date.getFullYear();
  const when = `${trip.dateRange}${year !== getNow().getFullYear() ? ` ${year}` : ""}`;
  const summary = [
    trip.days.some((d) => d.ev.is_party) ? "Feest" : trip.hasCon ? "Con" : "Reis",
    trip.days.length === 1 ? "1 dag" : `${trip.days.length} dagen`,
    trip.isHotel ? "hotel" : null,
  ].filter(Boolean).join(" · ");

  const participants = [...trip.participants].sort((a, b) => Number(isMine(b)) - Number(isMine(a)));
  const findUser = (p: string) => users.find((u) => u.name === p || u.discord_username === p || u.aliases?.includes(p));
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
    <article className="ticket-notch grid overflow-hidden rounded-[14px] border-2 border-outline bg-surface md:grid-cols-[200px_minmax(0,1fr)_168px] lg:grid-cols-[240px_minmax(0,1fr)_188px]">
      {/* ── Cover ── */}
      <div className="relative h-40 overflow-hidden bg-[#0F1519] sm:h-52 md:h-auto md:min-h-[280px]">
        {image ? (
          <img src={image} alt="" className={`absolute inset-0 h-full w-full object-cover ${phase === "past" ? "saturate-50" : ""}`} />
        ) : (
          <span
            className="absolute inset-0 flex flex-col justify-end p-4 text-[#E6F0F3]"
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
      </div>

      {/* ── Body ── */}
      <div className="flex min-w-0 flex-col gap-3.5 p-4 sm:p-5 md:px-6">
        <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.06em] text-ink">
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
                className="flex min-w-0 items-center gap-1.5 hover:text-ink hover:underline"
              >
                <MapPin size={13} className="shrink-0" /> <span className="truncate">{trip.location}</span>
              </a>
            )}
            {hotel && <span className="flex min-w-0 items-center gap-1.5"><BedDouble size={13} className="shrink-0" /> <span className="truncate">{hotel}</span></span>}
          </p>
          {description && <p className="mt-2 line-clamp-3 max-w-2xl text-[13px] leading-relaxed text-ink-2">{description}</p>}
        </div>

        {/* Days: tap one to sign up for it or off it, until it has passed */}
        {trip.days.length > 1 && (
          <div className="grid grid-cols-3 gap-2 sm:max-w-[320px]" role="group" aria-label="Jouw dagen">
            {trip.days.map((day) => {
              const { ev, date } = day;
              const isTravelDay = ev.has_con === false;
              const imGoing = ev.participants.some(isMine);
              const canToggle = toDateKey(date) >= today;
              const label = `${dayShort(date)} ${date.getDate()}`;
              const className = `relative min-w-0 rounded-[10px] border-1.5 border-line px-1.5 py-2 text-center transition-colors ${
                isTravelDay ? "bg-hatch-surface" : "bg-surface"
              } ${canToggle ? "hover:border-ink-3" : ""} ${imGoing || phase === "past" ? "" : "opacity-60"}`;
              const content = (
                <>
                  {imGoing && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-1.5 border-outline bg-brand text-brand-on">
                      <Check size={9} strokeWidth={3} />
                    </span>
                  )}
                  <span className="block font-mono text-[10px] uppercase leading-none tracking-[0.08em] text-ink-3">
                    {dayShort(date)} {monthShort(date)}
                  </span>
                  <span className="block font-display text-[26px] font-extrabold leading-none text-ink">{date.getDate()}</span>
                  <span className="mt-1 block truncate text-[11.5px] leading-none text-ink-2">
                    {isTravelDay ? "Reisdag" : `${ev.participants.length} mee`}
                  </span>
                </>
              );
              return canToggle ? (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => onToggleDay(day)}
                  aria-pressed={imGoing}
                  aria-label={`${label}: ${imGoing ? "je gaat mee, tik om je af te melden" : "tik om je aan te melden"}`}
                  className={className}
                >
                  {content}
                </button>
              ) : (
                <div key={ev.id} className={className} title={ev.event_name}>
                  {content}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-2.5">
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
          <span className="min-w-0 flex-1 text-[13px] text-ink-2">
            {crewText}
            {going && myDays.length < trip.days.length && (
              <span className="text-ink-3"> · jij {myDays.length} van {trip.days.length} dagen</span>
            )}
          </span>
          <span className="flex items-center gap-2">
            {uploadDayId && <StoryUploadButton eventDayId={uploadDayId} />}
            <button
              type="button"
              onClick={onShare}
              title="Delen"
              aria-label="Delen"
              className="flex h-9 w-9 items-center justify-center rounded-xl border-1.5 border-line bg-surface text-ink-2 transition-colors hover:border-ink-3 hover:text-ink"
            >
              <Share2 size={15} />
            </button>
          </span>
        </div>
      </div>

      {/* ── Stub ── */}
      <div className="relative flex h-[118px] items-center justify-between gap-4 border-t-2 border-dashed border-line px-5 md:h-auto md:flex-col md:items-stretch md:border-l-2 md:border-t-0 md:py-5">
        <div className="flex items-end gap-2.5 md:flex-col md:items-start md:gap-1">
          <span className="font-display text-[60px] font-black leading-[0.8] text-ink md:text-[96px]">{count.big}</span>
          <span className="pb-0.5 text-[13px] leading-tight text-ink-2">{count.small}</span>
        </div>

        {(going || phase === "past") && (
          <motion.span
            aria-hidden
            initial={justJoined ? { scale: 1.8, rotate: -24, opacity: 0 } : false}
            animate={{ scale: 1, rotate: -12, opacity: 1 }}
            transition={{ type: "spring", stiffness: 520, damping: 22 }}
            className={`pointer-events-none shrink-0 rounded-lg border-[2.5px] bg-surface/80 px-2 pb-0.5 pt-1 text-center font-display text-[18px] font-black uppercase leading-[0.9] md:absolute md:right-4 md:top-[130px] md:text-[22px] ${
              going ? "border-brand-text text-brand-text" : "border-ink-3 text-ink-3"
            }`}
          >
            {stamp === "Je gaat mee" ? <>Je gaat<br />mee</> : stamp}
          </motion.span>
        )}

        <div className="flex flex-col items-end gap-2 md:items-stretch">
          {phase !== "past" && (going ? (
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
          ))}
          <button
            type="button"
            onClick={onManage}
            className="text-[12.5px] font-semibold text-brand-text hover:underline md:text-left"
          >
            {phase === "past" ? "Aanmeldingen aanpassen" : "Anderen aanmelden"}
          </button>
        </div>
      </div>
    </article>
  );
}
