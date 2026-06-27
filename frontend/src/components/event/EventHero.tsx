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

  const isPast = daysUntil !== null && daysUntil < 0;

  const bgGradient = isPast
    ? { from: "#0f172a", mid: "#1e293b", to: "#334155" }
    : { from: "#312e81", mid: "#4338ca", to: "#6d28d9" };

  return (
    <div className={`relative overflow-hidden ${isPast ? "opacity-80" : ""}`} style={{ minHeight: 240 }}>
      {/* Layered gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 10% 30%, ${bgGradient.from}cc 0%, transparent 55%),
            radial-gradient(ellipse at 90% 70%, ${bgGradient.to}99 0%, transparent 50%),
            linear-gradient(150deg, ${bgGradient.from} 0%, ${bgGradient.mid} 50%, ${bgGradient.to} 100%)
          `,
        }}
      />
      {/* Grain texture */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.12] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <filter id="event-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#event-noise)" />
      </svg>
      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
      {/* Watermark icon */}
      <div className="absolute -right-6 top-1/2 -translate-y-1/2 opacity-[0.07] pointer-events-none">
        <CalendarDays size={160} strokeWidth={1} className="text-white" />
      </div>

      {/* Content */}
      <div className="relative max-w-4xl mx-auto px-4 pt-8 pb-10">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {event.event_group_id && (
            <span className="inline-flex items-center rounded-full bg-white/10 border border-white/15 backdrop-blur-sm px-3 py-1 text-[11px] font-semibold text-white/80">
              {event.event_group_id}
            </span>
          )}
          {event.is_hotel && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/20 border border-violet-400/30 backdrop-blur-sm px-3 py-1 text-[11px] font-semibold text-violet-200">
              <BedDouble size={10} /> Hotel
            </span>
          )}
          {daysUntil !== null && daysUntil >= 0 && (
            <span className="inline-flex items-center rounded-full bg-white/20 border border-white/25 backdrop-blur-sm px-3 py-1 text-[11px] font-bold text-white">
              {daysUntil === 0 ? "Vandaag 🎉" : daysUntil === 1 ? "Morgen!" : `Over ${daysUntil} dagen`}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl lg:text-4xl font-black text-white leading-tight tracking-tight mb-1 drop-shadow-md">
          {event.event_name}
        </h1>

        {event.description && (
          <p className="mt-1.5 mb-3 text-sm text-white/60 leading-relaxed max-w-xl">
            {event.description}
          </p>
        )}

        {/* Meta chips */}
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="flex items-center gap-1.5 rounded-xl bg-black/25 backdrop-blur-sm border border-white/10 px-3 py-1.5 text-xs font-bold text-white">
            <CalendarDays size={12} className="text-violet-300" />
            <span className="capitalize">{formatEventDate(event.date)}</span>
          </span>
          {event.location && (
            <span className="flex items-center gap-1.5 rounded-xl bg-black/25 backdrop-blur-sm border border-white/10 px-3 py-1.5 text-xs font-bold text-white">
              <MapPin size={12} className="text-violet-300" />
              {event.location}
            </span>
          )}
        </div>

        {/* Attendee strip */}
        {event.participants.length > 0 && (
          <div className="mt-5 flex items-center gap-3">
            <div className="flex -space-x-2">
              {event.participants.slice(0, 6).map((p) => {
                const u = resolveUser(p);
                return (
                  <UserAvatar key={p} name={u?.name ?? p} user={u}
                    className="h-7 w-7 text-[10px] ring-2 ring-black/30" />
                );
              })}
            </div>
            <span className="text-xs font-semibold text-white/70">
              <span className="font-black text-white">{event.participants.length}</span>{" "}
              {event.participants.length === 1 ? "aanmelding" : "aanmeldingen"}
            </span>
          </div>
        )}
      </div>

      {/* Bottom fade */}
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-50 dark:from-slate-950 to-transparent pointer-events-none" />
    </div>
  );
}
