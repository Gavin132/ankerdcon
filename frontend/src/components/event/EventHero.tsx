import { BedDouble, CalendarDays, MapPin } from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { formatEventDate } from "../../utils/format";
import type { CalendarEvent, User } from "../../types";

interface EventHeroProps {
  event: CalendarEvent;
  daysUntil: number | null;
  users: User[];
}

export function EventHero({ event, daysUntil, users }: EventHeroProps) {
  function resolveUser(stored: string) {
    return users.find(
      (u) => u.name === stored || u.discord_username === stored || u.aliases?.includes(stored),
    );
  }

  return (
    <div className="relative overflow-hidden gradient-hero">
      {/* Layered decorative blobs */}
      <div className="pointer-events-none absolute -top-20 -right-16 h-72 w-72 rounded-full bg-sky-400/15 blur-3xl" />
      <div className="pointer-events-none absolute top-10 right-24 h-40 w-40 rounded-full bg-indigo-500/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 left-0 h-56 w-80 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-4 right-4 h-24 w-24 rounded-full bg-sky-300/10 blur-xl" />

      <div className="relative max-w-4xl mx-auto px-4 pt-9 pb-12">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {event.event_group_id && (
            <span className="inline-flex items-center rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[11px] font-semibold text-sky-200">
              {event.event_group_id}
            </span>
          )}
          {event.is_hotel && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/20 border border-violet-400/25 px-3 py-1 text-[11px] font-semibold text-violet-200">
              <BedDouble size={10} /> Hotel
            </span>
          )}
          {daysUntil !== null && daysUntil >= 0 && (
            <span className="inline-flex items-center rounded-full gradient-brand px-3 py-1 text-[11px] font-bold text-white shadow-sm">
              {daysUntil === 0 ? "Vandaag 🎉" : daysUntil === 1 ? "Morgen!" : `Over ${daysUntil} dagen`}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-4xl lg:text-5xl font-black text-white leading-[1.05] tracking-tight mb-5">
          {event.event_name}
        </h1>

        {/* Date + Location */}
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <span className="flex items-center gap-2 text-sm text-sky-200/80">
            <CalendarDays size={14} className="text-sky-400 shrink-0" />
            <span className="font-medium capitalize">{formatEventDate(event.date)}</span>
          </span>
          {event.location && (
            <span className="flex items-center gap-2 text-sm text-sky-200/80">
              <MapPin size={14} className="text-sky-400 shrink-0" />
              <span className="font-medium">{event.location}</span>
            </span>
          )}
        </div>

        {event.description && (
          <p className="mt-4 text-sm text-sky-100/60 leading-relaxed max-w-xl">
            {event.description}
          </p>
        )}

        {/* Participant count pill */}
        {event.participants.length > 0 && (
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3.5 py-1.5">
            <div className="flex -space-x-1.5">
              {event.participants.slice(0, 4).map((p) => {
                const u = resolveUser(p);
                return (
                  <UserAvatar key={p} name={u?.name ?? p} user={u}
                    className="h-5 w-5 text-[8px] ring-1 ring-white/30" />
                );
              })}
            </div>
            <span className="text-xs font-semibold text-sky-100">
              {event.participants.length} {event.participants.length === 1 ? "aanmelding" : "aanmeldingen"}
            </span>
          </div>
        )}
      </div>

      {/* Bottom fade */}
      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-50/30 dark:from-slate-950/30 to-transparent pointer-events-none" />
    </div>
  );
}
