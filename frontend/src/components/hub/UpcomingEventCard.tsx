import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays, BedDouble, ChevronRight, Layers, ArrowRight,
} from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { formatDate } from "../../utils/format";
import { dayShort, monthShort } from "../../utils/multiDay";
import type { CalendarEvent, User } from "../../types";
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
    <span className="text-xs text-slate-500 tabular-nums">
      {daysUntil === 1 ? "1 dag" : `${daysUntil} dagen`}
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
  groupColor: { accent: string } | null;
  groupTitle: string | null;
  groupDateRange: string | null;
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
  groupColor,
  groupTitle,
  groupDateRange,
  users,
  onNavigate,
  onParticipantClick,
}: UpcomingEventCardProps) {
  const [participantsExpanded, setParticipantsExpanded] = useState(false);

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

    <div className="relative card-surface rounded-2xl overflow-hidden">

      {/* ── Cover image (when available, full-bleed top section) ── */}
      {hasCover && (
        <div className="relative h-40 overflow-hidden">
          <img
            src={coverImage!}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Gradient: transparent top → card-surface bottom — seamless blend */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-[#1e293b]" />
          {/* Urgency chip over image */}
          <div className="absolute bottom-3 left-4 flex items-center gap-2">
            <UrgencyChip urgency={urgency} daysUntil={daysUntil} />
          </div>
        </div>
      )}

      {/* ── Accent bar (when no cover image) ── */}
      {!hasCover && (
        <div
          className="h-[3px]"
          style={{
            background: isGroupEvent && groupColor
              ? `linear-gradient(90deg,${groupColor.accent},${groupColor.accent}66)`
              : "linear-gradient(90deg,rgb(14,165,233),rgb(99,102,241))",
          }}
        />
      )}

      {/* ── Card body ── */}
      {isGroupEvent ? (
        <div
          onClick={() => onNavigate(groupEvents![0].ev.id)}
          className="p-5 cursor-pointer group transition-colors hover:bg-slate-100/80 dark:hover:bg-white/10"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <div
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1"
                style={{ backgroundColor: groupColor!.accent + "18", borderColor: groupColor!.accent + "35" }}
              >
                <Layers size={10} style={{ color: groupColor!.accent }} />
                <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: groupColor!.accent }}>
                  Meerdaags evenement
                </span>
              </div>
              {groupEvents!.some(({ ev }) => ev.is_hotel) && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-1">
                  <BedDouble size={10} className="text-sky-500" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-sky-500">
                    Hotel
                  </span>
                </div>
              )}
              {!hasCover && <UrgencyChip urgency={urgency} daysUntil={daysUntil} />}
            </div>
            <ArrowRight size={14} className="text-slate-400 dark:text-slate-600 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </div>

          <h2 className="text-[22px] font-black text-slate-900 dark:text-white leading-tight tracking-tight">
            {groupTitle}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
              <CalendarDays size={12} /> {groupDateRange}
            </span>
            <span className="text-sm text-slate-400 dark:text-slate-500">
              {groupEvents!.length} {groupEvents!.length === 1 ? "dag" : "dagen"}
            </span>
          </div>

          {groupDescription && (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
              {groupDescription}
            </p>
          )}

          {/* Per-day rows */}
          <div className="mt-4 space-y-1.5 pl-3" style={{ borderLeft: `2px solid ${groupColor!.accent}30` }}>
            {groupEvents!.map(({ ev: dayEv, date }) => (
              <button
                key={dayEv.id}
                onClick={(e) => { e.stopPropagation(); onNavigate(dayEv.id); }}
                className="w-full flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors px-3 py-2.5 text-left"
              >
                <div className="shrink-0 text-center w-7">
                  <p className="text-[9px] font-bold uppercase text-slate-400">{dayShort(date)}</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white leading-none">{date.getDate()}</p>
                  <p className="text-[9px] text-slate-400 font-medium">{monthShort(date)}</p>
                </div>
                <p className="flex-1 text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">{dayEv.event_name}</p>
                {dayEv.participants.length > 0 && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex -space-x-1">
                      {dayEv.participants.slice(0, 3).map((p) => {
                        const u = users.find(u => u.name === p || u.discord_username === p || u.aliases?.includes(p));
                        return <UserAvatar key={p} name={u?.name ?? p} user={u} className="h-4 w-4 text-[7px] ring-[1.5px] ring-white dark:ring-slate-800" />;
                      })}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 tabular-nums">{dayEv.participants.length}</span>
                  </div>
                )}
                <ChevronRight size={12} className="text-slate-300 dark:text-slate-600 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* ── Single event ── */
        <div
          onClick={() => onNavigate(event.id)}
          className="cursor-pointer group transition-colors hover:bg-slate-100/80 dark:hover:bg-white/10"
        >
          <div className="px-5 pt-5 pb-4">
            {/* Label row — only show urgency chip here when no cover image */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 border border-sky-500/15 px-2.5 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-[0.12em]">
                    Aankomend evenement
                  </span>
                </div>
                {!hasCover && <UrgencyChip urgency={urgency} daysUntil={daysUntil} />}
              </div>
              <ArrowRight size={14} className="text-slate-400 dark:text-slate-600 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </div>

            <h2 className="text-[22px] font-black text-slate-900 dark:text-white leading-tight tracking-tight">
              {event.event_name}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                <CalendarDays size={12} /> {formatDate(event.date)}
              </span>
              {event.is_hotel && (
                <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                  <BedDouble size={12} /> Hotel inbegrepen
                </span>
              )}
            </div>

            {event.description && (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                {event.description}
              </p>
            )}
          </div>

          {/* Participants */}
          {users.length > 0 && event.participants.length > 0 && (
            <div className="px-5 pt-3 pb-5 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex-1 h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-sky-500 transition-all duration-700"
                    style={{ width: `${Math.round((event.participants.length / users.length) * 100)}%` }}
                  />
                </div>
                <span className="shrink-0 text-[11px] font-bold text-slate-400 tabular-nums">
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
                    return <UserAvatar key={p} name={u?.name ?? p} user={u} className="h-6 w-6 text-[9px] ring-2 ring-white dark:ring-slate-900" />;
                  })}
                  {event.participants.length > 7 && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-white dark:ring-slate-900 bg-slate-200 dark:bg-slate-700 text-[9px] font-black text-slate-600 dark:text-slate-300">
                      +{event.participants.length - 7}
                    </div>
                  )}
                </div>
                <span className="text-[11px] font-semibold text-slate-400 hover:text-sky-500 transition-colors">
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
                            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:border-sky-500/30 transition-colors"
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
