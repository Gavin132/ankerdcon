import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BedDouble, CalendarDays, MapPin, PartyPopper, Utensils } from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { formatDate } from "../../utils/format";
import { dayShort, monthShort } from "../../utils/multiDay";
import type { CalendarEvent, Meal, User } from "../../types";
import type { AnchorRect } from "../common/UserProfilePopup";

export type EventUrgency = "today" | "tomorrow" | "normal";

// ── Pieces ────────────────────────────────────────────────────────────────────

function Chip({ children, tone = "plain" }: { children: React.ReactNode; tone?: "plain" | "live" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-[3px] text-[10.5px] font-semibold ${
        tone === "live"
          ? "border-brand bg-brand text-brand-on"
          : "border-white/25 bg-white/10 text-[#E6F0F3]"
      }`}
    >
      {children}
    </span>
  );
}

/** The brand-blue tear-off stub with the countdown. Beside the ticket from sm, below it on phones. */
function Stub({ urgency, daysUntil, dayCount }: { urgency: EventUrgency; daysUntil: number; dayCount: number }) {
  const label = urgency === "today" ? "Vandaag" : "Nog";
  const big = urgency === "today" ? "Nu" : String(daysUntil);
  const unit = urgency === "today" ? "bezig" : daysUntil === 1 ? "dag" : "dagen";

  return (
    <div className="flex items-center justify-center gap-3 border-t-2 border-dashed border-outline bg-brand px-4 py-2.5 text-brand-on sm:flex-col sm:gap-2 sm:border-l-2 sm:border-t-0 sm:px-4 sm:py-5 sm:text-center">
      <span className="text-[11px] font-semibold">{label}</span>
      <span className="font-display text-[52px] font-black leading-[0.8] sm:text-[88px]">{big}</span>
      <span className="text-[11px] leading-snug sm:w-full sm:border-t-1.5 sm:border-ink/35 sm:pt-2 dark:sm:border-[#0F1519]/35">
        <b className="block text-[13px]">{unit}</b>
        {dayCount > 1 ? `${dayCount} dagen event` : "1 dag event"}
      </span>
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
  const isHotel = dayEvents.some((ev) => ev.is_hotel);
  const isParty = dayEvents.some((ev) => ev.is_party);
  const isTravelOnly = !isGroupEvent && event.has_con === false && !event.is_party;
  const title = isGroupEvent ? groupTitle : event.event_name;
  const when = isGroupEvent ? groupDateRange : formatDate(event.date);
  const participants = [...new Set(dayEvents.flatMap((ev) => ev.participants ?? []))];

  function findUser(p: string) {
    return users.find((u) => u.name === p || u.discord_username === p || u.aliases?.includes(p));
  }

  return (
    <div className="grid h-full overflow-hidden rounded-[14px] border-2 border-outline bg-surface sm:grid-cols-[minmax(0,1fr)_152px]">
      <div className="flex min-w-0 flex-col">
        {/* ── Cover ── */}
        <button
          type="button"
          onClick={() => onNavigate(event.id)}
          className="relative h-16 overflow-hidden bg-[#0F1519] text-left sm:h-20"
          aria-label={`Open ${title}`}
        >
          {coverImage ? (
            <img src={coverImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
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
          <span aria-hidden className={`absolute inset-0 ${coverImage ? "bg-[#0F1519]/45" : ""}`} />
          <span className="absolute left-4 top-3 flex flex-wrap gap-1.5 sm:left-5 sm:top-4">
            {urgency === "today" && <Chip tone="live">Vandaag</Chip>}
            {urgency === "tomorrow" && <Chip>Morgen</Chip>}
            {isTravelOnly && <Chip>Reisdag</Chip>}
            {isHotel && <Chip><BedDouble size={11} /> Hotel</Chip>}
            {isParty && <Chip><PartyPopper size={11} /> Feestje</Chip>}
          </span>
        </button>

        {/* ── Body ── */}
        <div className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-5">
          <button type="button" onClick={() => onNavigate(event.id)} className="group text-left">
            <h2 className="font-display text-[30px] font-black uppercase leading-[0.92] tracking-[0.01em] text-ink group-hover:underline decoration-2 underline-offset-4 sm:text-[38px]">
              {title}
            </h2>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-2">
              <span className="flex items-center gap-1.5"><CalendarDays size={13} className="shrink-0" /> {when}</span>
              {location && <span className="flex min-w-0 items-center gap-1.5"><MapPin size={13} className="shrink-0" /> <span className="truncate">{location}</span></span>}
              {!isGroupEvent && hasMeal(event.id) && <span className="flex items-center gap-1.5"><Utensils size={13} className="shrink-0" /> Etentje gepland</span>}
            </p>
            {description && (
              <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-ink-3">{description}</p>
            )}
          </button>

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
                    className={`min-w-0 rounded-[10px] border-1.5 border-line px-1.5 py-2 text-center transition-colors hover:border-ink-3 ${
                      isTravelDay ? "bg-hatch-surface" : "bg-surface"
                    }`}
                  >
                    <span className="block text-[10px] leading-none text-ink-3">
                      {dayShort(date)} {monthShort(date)}
                    </span>
                    <span className="block font-display text-[26px] font-extrabold leading-none text-ink">{date.getDate()}</span>
                    <span className="mt-1 flex items-center justify-center gap-1 text-[11.5px] leading-none text-ink-2">
                      {isTravelDay ? <BedDouble size={11} className="shrink-0" /> : null}
                      {hasMeal(dayEv.id) && <Utensils size={11} className="shrink-0" />}
                      <span className="truncate">{isTravelDay ? "Reisdag" : `${dayEv.participants.length} mee`}</span>
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
                className="flex items-center gap-2 text-left"
                aria-expanded={participantsExpanded}
              >
                <span className="flex -space-x-1.5">
                  {participants.slice(0, 5).map((p) => {
                    const u = findUser(p);
                    return <UserAvatar key={p} name={u?.name ?? p} user={u} className="h-6 w-6 text-[9px] !border-surface" />;
                  })}
                </span>
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
                    className="overflow-hidden"
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
                            className="inline-flex items-center gap-1.5 rounded-full border-1.5 border-line px-2 py-1 text-[12px] font-medium text-ink-2 transition-colors hover:border-ink-3 hover:text-ink"
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

      <Stub urgency={urgency} daysUntil={daysUntil} dayCount={days.length} />
    </div>
  );
}
