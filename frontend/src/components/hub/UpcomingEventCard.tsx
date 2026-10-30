import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BedDouble, Globe, MapPin, Music2, PartyPopper, Utensils } from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { AvatarStack } from "../common/AvatarStack";
import { InfoChip } from "../common/InfoChip";
import { parseEventDate, todayKey, toDateKey } from "../../utils/date";
import { formatDate, mapsUrl, siteLabel } from "../../utils/format";
import { safeHref } from "../../utils/validation";
import { dayShort, formatDateRange } from "../../utils/multiDay";
import { findUser as findMember, groupPeople } from "../../utils/people";
import type { CalendarEvent, Meal, User } from "../../types";
import type { AnchorRect } from "../common/UserProfilePopup";

export type EventUrgency = "today" | "tomorrow" | "normal";

// ── Pieces ────────────────────────────────────────────────────────────────────

function Chip({ children, tone = "plain" }: { children: React.ReactNode; tone?: "plain" | "live" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-[3px] text-[12px] font-semibold ${
        tone === "live"
          ? "border-brand bg-brand text-brand-on"
          : "border-hero-ink/25 bg-hero-ink/10 text-hero-ink"
      }`}
    >
      {children}
    </span>
  );
}

/**
 * The brand-blue tear-off stub with the countdown. Beside the ticket from sm, below it on phones. Today it says
 * "Vandaag" (events have a date, not a start time, so it cannot say that it has begun); once a multi-day trip is
 * under way it says "Nu bezig" and which day it is.
 */
function Stub({ urgency, daysUntil, dayCount, dayNumber }: { urgency: EventUrgency; daysUntil: number; dayCount: number; dayNumber: number | null }) {
  const today = urgency === "today";
  const underway = today && dayNumber !== null && dayNumber > 1;
  const big = underway ? "Nu" : today ? "Vandaag" : String(daysUntil);
  const unit = underway ? "bezig" : today ? "" : daysUntil === 1 ? "dag" : "dagen";
  const sub = underway ? `dag ${dayNumber} van ${dayCount}` : dayCount > 1 ? `${dayCount} dagen` : "";

  return (
    <div className="flex items-center justify-center gap-3 border-t-2 border-dashed border-outline bg-brand px-4 py-2.5 text-brand-on sm:flex-col sm:gap-2 sm:border-l-2 sm:border-t-0 sm:px-4 sm:py-5 sm:text-center">
      {!today && <span className="text-[12px] font-semibold">Nog</span>}
      <span className={`font-display font-black leading-[0.8] ${big.length > 3 ? "text-[34px] sm:text-[38px]" : "text-[52px] sm:text-[88px]"}`}>{big}</span>
      {(unit || sub) && (
        <span className="text-[12px] leading-snug sm:w-full sm:border-t-1.5 sm:border-brand-on/35 sm:pt-2">
          {unit && <b className="block text-[13px]">{unit}</b>}
          {sub}
        </span>
      )}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface UpcomingEventCardProps {
  event: CalendarEvent;
  daysUntil: number;
  urgency: EventUrgency;
  isGroupEvent: boolean;
  groupEvents: { ev: CalendarEvent; date: Date }[] | null;
  groupTitle: string | null;
  groupDateRange: string | null;
  meals?: Meal[];
  users: User[];
  onNavigate: (id: string) => void;
  onParticipantClick: (user: User, rect: AnchorRect) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * The Hub's one bold element: the nearest trip as a ticket. Ink outline, a
 * dotted ink cover (or the event image), the name in the display face and a
 * brand-blue stub with the countdown. Flat — no lift or shadow.
 */
export function UpcomingEventCard({
  event,
  daysUntil,
  urgency,
  isGroupEvent,
  groupEvents,
  groupTitle,
  groupDateRange,
  meals = [],
  users,
  onNavigate,
  onParticipantClick,
}: UpcomingEventCardProps) {
  const [participantsExpanded, setParticipantsExpanded] = useState(false);

  const days = isGroupEvent ? groupEvents! : [{ ev: event, date: null as Date | null }];
  const dayEvents = days.map((d) => d.ev);

  function hasMeal(eventId: string) {
    return meals.some((m) => m.linked_event_id === eventId);
  }

  const coverImage = dayEvents.map((ev) => ev.image_url).find(Boolean) ?? null;
  const description = dayEvents.map((ev) => ev.description).find(Boolean) ?? null;
  const location = dayEvents.map((ev) => ev.location).find(Boolean) ?? null;
  const websiteUrl = safeHref(dayEvents.map((ev) => ev.website).find(Boolean));
  const isHotel = dayEvents.some((ev) => ev.is_hotel);
  const eventType = dayEvents.find((ev) => ev.event_type)?.event_type ?? null;
  const isTravelOnly = !isGroupEvent && event.has_con === false && !event.event_type;
  const title = isGroupEvent ? groupTitle : event.event_name;
  // The short form the other ticket cards use ("za 7 nov"); the long one only when the date cannot be read.
  const eventDate = parseEventDate(event.date);
  const when = isGroupEvent ? groupDateRange : eventDate ? formatDateRange([eventDate]) : formatDate(event.date);
  // One person per entry, not per name they are signed up under (see utils/people.ts).
  const participants = groupPeople(dayEvents.flatMap((ev) => ev.participants ?? []), users).map((person) => person.name);

  // Which day of the trip it is today (null when it is not under way), counted over all of its days.
  const dayNumber = isGroupEvent ? days.filter((d) => d.date && toDateKey(d.date) <= todayKey()).length : null;

  function findUser(p: string) {
    return findMember(users, p);
  }

  return (
    // `relative`: the title link stretches over the whole card (its ::after), so tapping anywhere
    // opens the event; the buttons inside sit above it (`relative z-10`) and keep their own action.
    <div className="relative grid h-full grid-rows-[1fr_auto] overflow-hidden rounded-hero border-2 border-outline bg-surface sm:grid-cols-[minmax(0,1fr)_152px] sm:grid-rows-none">
      <div className="flex min-w-0 flex-col">
        {/* ── Cover ── */}
        <button
          type="button"
          onClick={() => onNavigate(event.id)}
          className="relative h-16 overflow-hidden bg-hero text-left sm:h-20"
          aria-label={`Open ${title}`}
        >
          {coverImage ? (
            <img src={coverImage} alt="" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-70" />
          ) : (
            <span
              aria-hidden
              className="absolute inset-0"
              style={{
                backgroundImage: "radial-gradient(circle, rgb(var(--cyan) / .55) 1.5px, transparent 1.9px)",
                backgroundSize: "9px 9px",
              }}
            />
          )}
          <span aria-hidden className={`absolute inset-0 ${coverImage ? "bg-hero/45" : ""}`} />
          <span className="absolute left-4 top-3 flex flex-wrap gap-1.5 sm:left-5 sm:top-4">
            {isTravelOnly && <Chip>Reisdag</Chip>}
            {isHotel && <Chip><BedDouble size={12} /> Hotel</Chip>}
            {eventType === "gathering" && <Chip><PartyPopper size={12} /> Feestje</Chip>}
            {eventType === "concert" && <Chip><Music2 size={12} /> Concert</Chip>}
          </span>
        </button>

        {/* ── Body ── */}
        <div className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-5">
          <div>
            <button
              type="button"
              onClick={() => onNavigate(event.id)}
              className="group block text-left after:absolute after:inset-0 after:z-0 after:content-['']"
            >
              <span className="mb-1.5 block font-mono text-xs font-semibold text-ink">{when}</span>
              <h2 className="font-display text-[30px] font-black uppercase leading-[0.92] tracking-[0.01em] text-ink group-hover:underline decoration-2 underline-offset-4 sm:text-[38px]">
                {title}
              </h2>
            </button>
            {/* Links, so they sit above the card-wide tap target (`z-10`) instead of inside the button. */}
            {(location || websiteUrl || (!isGroupEvent && hasMeal(event.id))) && (
              <div className="relative z-10 mt-2.5 flex flex-wrap items-center gap-2">
                {location && <InfoChip icon={<MapPin size={14} />} href={mapsUrl(location)}>{location}</InfoChip>}
                {websiteUrl && (
                  <InfoChip
                    icon={<Globe size={14} />}
                    href={websiteUrl}
                    external
                    title={`Website van het evenement: ${websiteUrl}`}
                    ariaLabel={`Website van het evenement, ${siteLabel(websiteUrl)} (opent in een nieuw tabblad)`}
                  >
                    {siteLabel(websiteUrl)}
                  </InfoChip>
                )}
                {!isGroupEvent && hasMeal(event.id) && <InfoChip icon={<Utensils size={14} />}>Activiteit gepland</InfoChip>}
              </div>
            )}
            {description && (
              <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-ink-3">{description}</p>
            )}
          </div>

          {/* Days of a multi-day trip — travel-only days are hatched */}
          {isGroupEvent && (
            <div className="grid grid-cols-3 gap-2">
              {groupEvents!.map(({ ev: dayEv, date }) => {
                const isTravelDay = dayEv.has_con === false;
                return (
                  <button
                    key={dayEv.id}
                    type="button"
                    onClick={() => onNavigate(dayEv.id)}
                    title={dayEv.event_name}
                    className={`relative z-10 min-w-0 rounded-xl border-1.5 border-line px-1.5 py-2 text-center transition-colors hover:border-ink-3 ${
                      isTravelDay ? "bg-hatch-surface" : "bg-surface"
                    }`}
                  >
                    <span className="block text-[12px] capitalize leading-none text-ink-3" aria-label={formatDate(dayEv.date)}>
                      {dayShort(date)}
                    </span>
                    <span className="block font-display text-[26px] font-extrabold leading-none text-ink">{date.getDate()}</span>
                    <span className="mt-1 flex items-center justify-center gap-1 text-[12px] leading-none text-ink-2">
                      {isTravelDay ? <BedDouble size={12} className="shrink-0" /> : null}
                      {hasMeal(dayEv.id) && <Utensils size={12} className="shrink-0" />}
                      <span className="truncate">{isTravelDay ? "Reisdag" : `${groupPeople(dayEv.participants ?? [], users).length} mee`}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Who's going */}
          {participants.length > 0 && (
            <div className="mt-auto">
              <button
                type="button"
                onClick={() => setParticipantsExpanded((v) => !v)}
                className="hit-area relative z-10 inline-flex items-center gap-2 py-1 text-left"
                aria-expanded={participantsExpanded}
              >
                <AvatarStack names={dayEvents.flatMap((ev) => ev.participants ?? [])} size="sm" />
                <span className="text-[13px] text-ink-2 hover:text-ink">
                  {participantsExpanded
                    ? "Verbergen"
                    : `${participants.length}${users.length > 0 ? ` van ${users.length}` : ""} gaan mee`}
                </span>
              </button>

              <AnimatePresence>
                {participantsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="pointer-events-none relative z-10 overflow-hidden"
                  >
                    <div className="flex flex-wrap gap-1.5 pt-2.5">
                      {participants.map((p) => {
                        const u = findUser(p);
                        const name = u?.name ?? p;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={(e) => {
                              if (!u) return;
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              onParticipantClick(u, { top: rect.top, left: rect.left, right: rect.right, height: rect.height });
                            }}
                            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border-1.5 border-line px-2 py-1 text-[12px] font-medium text-ink-2 transition-colors hover:border-ink-3 hover:text-ink"
                          >
                            <UserAvatar name={name} user={u} className="h-4 w-4 text-[7px] !border-0" />
                            {name}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <Stub urgency={urgency} daysUntil={daysUntil} dayCount={days.length} dayNumber={dayNumber} />
    </div>
  );
}
