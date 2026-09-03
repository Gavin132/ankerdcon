import { Link } from "react-router-dom";
import { BedDouble, CalendarDays, MapPin, UtensilsCrossed } from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { formatEventDate } from "../../utils/format";
import { routes } from "../../config/routes";
import type { CalendarEvent, Meal, User } from "../../types";

interface EventHeroProps {
  event: CalendarEvent;
  daysUntil: number | null;
  users: User[];
  meals?: Meal[];
}

export function EventHero({ event, daysUntil, users, meals = [] }: EventHeroProps) {
  function resolveUser(stored: string) {
    return users.find(
      (u) => u.name === stored || u.discord_username === stored || u.aliases?.includes(stored),
    );
  }

  const isPast = daysUntil !== null && daysUntil < 0;
  const isToday = daysUntil === 0;

  const bgGradient = isPast
    ? { a: "#0a0f1e", b: "#111827", c: "#1e293b" }
    : isToday
      ? { a: "#14532d", b: "#166534", c: "#15803d" }
      : { a: "#1e1b4b", b: "#312e81", c: "#4c1d95" };

  return (
    <div className={`relative overflow-hidden ${isPast ? "opacity-75" : ""}`} style={{ minHeight: 280 }}>
      {/* Cover image (if set) */}
      {event.image_url && (
        <img
          src={event.image_url}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      )}
      {/* Layered gradient (sits on top of image to ensure text legibility) */}
      <div
        className="absolute inset-0"
        style={{
          background: event.image_url
            ? `linear-gradient(135deg, ${bgGradient.a}e6 0%, ${bgGradient.b}cc 50%, ${bgGradient.c}99 100%)`
            : `
              radial-gradient(ellipse at 0% 50%, ${bgGradient.a}ff 0%, transparent 60%),
              radial-gradient(ellipse at 100% 0%, ${bgGradient.c}cc 0%, transparent 55%),
              radial-gradient(ellipse at 60% 100%, ${bgGradient.b}88 0%, transparent 50%),
              linear-gradient(135deg, ${bgGradient.a} 0%, ${bgGradient.b} 45%, ${bgGradient.c} 100%)
            `,
        }}
      />
      {/* Film grain */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.15] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <filter id="hero-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#hero-noise)" />
      </svg>
      {/* Inner glow top-left */}
      <div
        className="absolute -top-20 -left-20 h-72 w-72 rounded-full opacity-20 pointer-events-none"
        style={{ background: `radial-gradient(circle, #a78bfa 0%, transparent 70%)` }}
      />
      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10 pointer-events-none" />
      {/* Bottom fade into page bg */}
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-50 dark:from-slate-950 to-transparent pointer-events-none" />

      {/* Watermark */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-[0.05] pointer-events-none">
        <CalendarDays size={200} strokeWidth={0.75} className="text-white" />
      </div>

      {/* Content */}
      <div className="relative max-w-4xl mx-auto px-4 pt-8 pb-12">

        {/* Top badges row */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {event.event_group_id && (
            <span className="inline-flex items-center rounded-full bg-white/10 border border-white/15 backdrop-blur-sm px-3 py-1 text-[11px] font-bold text-white/80 tracking-wide">
              {event.event_group_id}
            </span>
          )}
          {event.is_hotel && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/25 border border-violet-400/40 backdrop-blur-sm px-3 py-1 text-[11px] font-bold text-violet-200">
              <BedDouble size={10} /> Hotel
            </span>
          )}
          {daysUntil !== null && daysUntil >= 0 && (
            <span className={`inline-flex items-center rounded-full border backdrop-blur-sm px-3 py-1 text-[11px] font-black ${
              isToday
                ? "bg-emerald-500/25 border-emerald-400/40 text-emerald-200"
                : daysUntil === 1
                  ? "bg-sky-500/20 border-sky-400/30 text-sky-200"
                  : "bg-white/15 border-white/20 text-white"
            }`}>
              {isToday ? "Vandaag 🎉" : daysUntil === 1 ? "Morgen!" : `Over ${daysUntil} dagen`}
            </span>
          )}
          {isPast && (
            <span className="inline-flex items-center rounded-full bg-white/10 border border-white/10 px-3 py-1 text-[11px] font-bold text-white/40">
              Afgelopen
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight drop-shadow-lg">
          {event.event_name}
        </h1>

        {event.description && (
          <p className="mt-2 text-sm text-white/55 leading-relaxed max-w-lg">
            {event.description}
          </p>
        )}

        {/* Meta chips */}
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="flex items-center gap-1.5 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1.5 text-xs font-bold text-white/90">
            <CalendarDays size={12} className="text-violet-300/80" />
            <span className="capitalize">{formatEventDate(event.date)}</span>
          </span>
          {event.location && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(event.location)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1.5 text-xs font-bold text-white/90 hover:bg-black/50 hover:border-white/20 active:scale-[0.97] transition-all"
            >
              <MapPin size={12} className="text-violet-300/80" />
              {event.location}
            </a>
          )}
          {meals.length > 0 && (
            <Link
              to={routes.meal.view(meals[0].id)}
              className="flex items-center gap-1.5 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1.5 text-xs font-bold text-white/90 hover:bg-black/50 hover:border-white/20 active:scale-[0.97] transition-all max-w-[220px]"
            >
              <UtensilsCrossed size={12} className="text-amber-300/80 shrink-0" />
              <span className="truncate">{meals[0].meal_name}</span>
              {meals.length > 1 && <span className="shrink-0 text-white/50">+{meals.length - 1}</span>}
            </Link>
          )}
          {event.is_hotel && (
            <Link
              to={routes.eventHotel.view(event.id)}
              className="flex items-center gap-1.5 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1.5 text-xs font-bold text-white/90 hover:bg-black/50 hover:border-white/20 active:scale-[0.97] transition-all"
            >
              <BedDouble size={12} className="text-violet-300/80" />
              Hotel
            </Link>
          )}
        </div>

        {/* Attendee strip */}
        {event.participants.length > 0 && (
          <div className="mt-5 flex items-center gap-3">
            <div className="flex -space-x-2.5">
              {event.participants.slice(0, 8).map((p) => {
                const u = resolveUser(p);
                return (
                  <UserAvatar
                    key={p}
                    name={u?.name ?? p}
                    user={u}
                    className="h-8 w-8 text-[10px] ring-2 ring-black/30"
                  />
                );
              })}
            </div>
            <p className="text-sm text-white/60">
              <span className="font-black text-white">{event.participants.length}</span>{" "}
              {event.participants.length === 1 ? "aanmelding" : "aanmeldingen"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
