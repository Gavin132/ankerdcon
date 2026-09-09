import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays, BedDouble, Utensils, ChevronRight, ArrowRight, PartyPopper,
} from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { formatDate } from "../../utils/format";
import { dayShort, monthShort } from "../../utils/multiDay";
import type { CalendarEvent, Meal, User } from "../../types";
import type { AnchorRect } from "../common/UserProfilePopup";

export type EventUrgency = "today" | "tomorrow" | "normal";

// ── Urgency chip — inline, replaces the floating badge ───────────────────────

function UrgencyChip({ urgency, daysUntil }: { urgency: EventUrgency; daysUntil: number }) {
  if (urgency === "today") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 border border-sky-400/30 px-2.5 py-1 text-[10px] font-bold text-sky-300 uppercase tracking-[0.1em]">
        <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
        Vandaag
      </span>
    );
  }
  if (urgency === "tomorrow") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 text-[10px] font-bold text-amber-400 uppercase tracking-[0.1em]">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        Morgen
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-2.5 py-1 text-[10px] font-bold text-sky-200 uppercase tracking-[0.1em] tabular-nums">
      {daysUntil === 1 ? "Nog 1 dag" : `Nog ${daysUntil} dagen`}
    </span>
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

  function hasMeal(eventId: string) {
    return meals.some((m) => m.linked_event_id === eventId);
  }

  // For group (multi-day) events, fall back across sibling days for a cover image/description.
  const groupImage = isGroupEvent
    ? (groupEvents!.map(({ ev }) => ev.image_url).find(Boolean) ?? null)
    : null;
  const groupDescription = isGroupEvent
    ? (groupEvents!.map(({ ev }) => ev.description).find(Boolean) ?? null)
    : null;

  const coverImage = isGroupEvent ? groupImage : event.image_url;
  const hasCover = !!coverImage;

  return (

    <div className="relative gradient-hero shadow-hero rounded-2xl overflow-hidden h-full flex flex-col">
      {/* Decorative glow — matches the /more upcoming-event tile */}
      <div className="pointer-events-none absolute -top-8 -right-8 h-28 w-28 rounded-full bg-sky-400/10" />
      {/* Decorative glow — matches the quick-ride tiles on this same page */}
      <div className="pointer-events-none absolute -bottom-10 -right-10 h-36 w-36 rounded-full bg-sky-400/10" />

      {/* ── Cover image (when available, full-bleed top section) ── */}
      {hasCover && (
        <div className="relative h-40 overflow-hidden">
          <img
            src={coverImage!}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Gradient: transparent top → hero navy bottom — seamless blend */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-[#0C2A3E]" />
        </div>
      )}

      {/* ── Card body ── */}
      {isGroupEvent ? (
        <div
          onClick={() => onNavigate(groupEvents![0].ev.id)}
          className="relative p-5 flex-1 flex flex-col cursor-pointer group transition-colors hover:bg-white/[0.04]"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <UrgencyChip urgency={urgency} daysUntil={daysUntil} />
              {groupEvents!.some(({ ev }) => ev.is_hotel) && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-400/50 bg-teal-400/20 px-2.5 py-1">
                  <BedDouble size={10} className="text-teal-200" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-teal-200">
                    Hotel
                  </span>
                </div>
              )}
              {groupEvents!.some(({ ev }) => ev.is_party) && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-pink-400/50 bg-pink-400/20 px-2.5 py-1">
                  <PartyPopper size={10} className="text-pink-200" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-pink-200">
                    Feestje
                  </span>
                </div>
              )}
            </div>
            <ArrowRight size={14} className="text-sky-300/40 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-sky-300" />
          </div>

          <h2 className="text-[22px] font-black text-white leading-tight tracking-tight">
            {groupTitle}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1.5 text-sm text-sky-300">
              <CalendarDays size={12} className="text-sky-400" /> {groupDateRange}
            </span>
            <span className="text-sm text-sky-300/50">
              {groupEvents!.length} {groupEvents!.length === 1 ? "dag" : "dagen"}
            </span>
          </div>

          {groupDescription && (
            <p className="mt-2 text-sm text-sky-100/60 leading-relaxed line-clamp-2">
              {groupDescription}
            </p>
          )}

          {/* Per-day rows — teal for a hotel-only travel day, blue for a con day */}
          <div className="mt-4 space-y-1.5 pl-3 border-l-2 border-blue-400/20">
            {groupEvents!.map(({ ev: dayEv, date }) => {
              const isTravelDay = dayEv.has_con === false;
              return (
              <button
                key={dayEv.id}
                onClick={(e) => { e.stopPropagation(); onNavigate(dayEv.id); }}
                className={`w-full flex items-center gap-3 rounded-xl border transition-colors px-3 py-2.5 text-left ${
                  isTravelDay
                    ? "bg-teal-500/20 border-teal-400/25 hover:bg-teal-500/25"
                    : "bg-blue-500/20 border-blue-400/25 hover:bg-blue-500/25"
                }`}
              >
                <div className="shrink-0 text-center w-7">
                  <p className="text-[9px] font-bold uppercase text-sky-300/50">{dayShort(date)}</p>
                  <p className="text-sm font-black text-white leading-none">{date.getDate()}</p>
                  <p className="text-[9px] text-sky-300/50 font-medium">{monthShort(date)}</p>
                </div>
                <p className="flex-1 text-xs font-semibold text-sky-100/80 truncate">{dayEv.event_name}</p>
                {isTravelDay && <BedDouble size={11} className="shrink-0 text-teal-400" />}
                {hasMeal(dayEv.id) && <Utensils size={11} className="shrink-0 text-amber-400" />}
                {dayEv.participants.length > 0 && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex -space-x-1">
                      {dayEv.participants.slice(0, 3).map((p) => {
                        const u = users.find(u => u.name === p || u.discord_username === p || u.aliases?.includes(p));
                        return <UserAvatar key={p} name={u?.name ?? p} user={u} className="h-4 w-4 text-[7px] ring-[1.5px] ring-[#0C2A3E]" />;
                      })}
                    </div>
                    <span className="text-[10px] font-bold text-sky-300/50 tabular-nums">{dayEv.participants.length}</span>
                  </div>
                )}
                <ChevronRight size={12} className="text-sky-300/40 shrink-0" />
              </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* ── Single event ── */
        <div
          onClick={() => onNavigate(event.id)}
          className="relative flex-1 flex flex-col cursor-pointer group transition-colors hover:bg-white/[0.04]"
        >
          <div className="px-5 pt-5 pb-4">
            {/* Label row */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <UrgencyChip urgency={urgency} daysUntil={daysUntil} />
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
                <span className="text-xs font-bold text-sky-400 uppercase tracking-widest">
                  {event.has_con === false && !event.is_party ? "Reisdag" : "Aankomend evenement"}
                </span>
              </div>
              <ArrowRight size={14} className="text-sky-300/40 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-sky-300" />
            </div>

            <h2 className="text-[22px] font-black text-white leading-tight tracking-tight">
              {event.event_name}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="flex items-center gap-1.5 text-sm text-sky-300">
                <CalendarDays size={12} className="text-sky-400" /> {formatDate(event.date)}
              </span>
              {event.is_hotel && (
                <span className="flex items-center gap-1.5 text-sm text-teal-300">
                  <BedDouble size={12} className="text-teal-400" /> Hotel inbegrepen
                </span>
              )}
              {hasMeal(event.id) && (
                <span className="flex items-center gap-1.5 text-sm text-sky-300">
                  <Utensils size={12} className="text-amber-400" /> Etentje gepland
                </span>
              )}
              {event.is_party && (
                <span className="flex items-center gap-1.5 text-sm text-pink-300">
                  <PartyPopper size={12} className="text-pink-400" /> Feestje
                </span>
              )}
            </div>

            {event.description && (
              <p className="mt-2 text-sm text-sky-100/60 leading-relaxed line-clamp-2">
                {event.description}
              </p>
            )}
          </div>

          {/* Participants */}
          {users.length > 0 && event.participants.length > 0 && (
            <div className="px-5 pt-3 pb-5 border-t border-white/10">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-sky-400 transition-all duration-700"
                    style={{ width: `${Math.round((event.participants.length / users.length) * 100)}%` }}
                  />
                </div>
                <span className="shrink-0 text-[11px] font-bold text-sky-300/50 tabular-nums">
                  {event.participants.length}/{users.length}
                </span>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); setParticipantsExpanded(v => !v); }}
                className="flex items-center gap-2 text-left"
              >
                <div className="flex -space-x-2">
                  {event.participants.slice(0, 7).map((p) => {
                    const u = users.find(u => u.name === p || u.discord_username === p || u.aliases?.includes(p));
                    return <UserAvatar key={p} name={u?.name ?? p} user={u} className="h-6 w-6 text-[9px] ring-2 ring-[#0C2A3E]" />;
                  })}
                  {event.participants.length > 7 && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-[#0C2A3E] bg-white/10 text-[9px] font-black text-sky-100">
                      +{event.participants.length - 7}
                    </div>
                  )}
                </div>
                <span className="text-[11px] font-semibold text-sky-300/60 hover:text-sky-300 transition-colors">
                  {participantsExpanded ? "Verbergen" : `${event.participants.length} aangemeld`}
                </span>
              </button>

              <AnimatePresence>
                {participantsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden mt-2"
                  >
                    <div className="flex flex-wrap gap-1.5">
                      {event.participants.map((p) => {
                        const u = users.find(u => u.name === p || u.discord_username === p || u.aliases?.includes(p));
                        const name = u?.name ?? p;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!u) return;
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              onParticipantClick(u, { top: rect.top, left: rect.left, right: rect.right, height: rect.height });
                            }}
                            className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/10 px-2 py-1 text-[11px] font-semibold text-sky-100 hover:border-sky-400/40 transition-colors"
                          >
                            <UserAvatar name={name} user={u} className="h-3.5 w-3.5 text-[7px] !border-0" />
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
      )}
    </div>
  );
}
