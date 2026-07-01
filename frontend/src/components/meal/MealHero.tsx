import { Link } from "react-router-dom";
import { Clock, MapPin, Banknote, Bus, CalendarDays, UtensilsCrossed } from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { formatDateTime } from "../../utils/format";
import { routes } from "../../config/routes";
import type { CalendarEvent, Meal, User } from "../../types";

interface MealHeroProps {
  meal: Meal;
  linkedEvent?: CalendarEvent;
  users: User[];
}

export function MealHero({ meal, linkedEvent, users }: MealHeroProps) {
  const participants = meal.participants ?? [];

  function resolveUser(stored: string) {
    return users.find(
      (u) =>
        u.name === stored ||
        u.discord_username === stored ||
        u.aliases?.includes(stored),
    );
  }

  return (
    <div className="relative overflow-hidden" style={{ minHeight: 260 }}>
      {/* ── Photo-like layered background ───────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 20% 50%, rgba(245,158,11,0.55) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 20%, rgba(239,68,68,0.4) 0%, transparent 55%),
            radial-gradient(ellipse at 60% 90%, rgba(251,191,36,0.35) 0%, transparent 50%),
            linear-gradient(135deg, #92400e 0%, #b45309 30%, #c2410c 65%, #9f1239 100%)
          `,
        }}
      />
      {/* Grain/noise texture for depth */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.15] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <filter id="meal-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#meal-noise)" />
      </svg>
      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-black/20 pointer-events-none" />
      {/* Large icon watermark */}
      <div className="absolute -right-8 -bottom-8 opacity-[0.08] pointer-events-none">
        <UtensilsCrossed size={180} className="text-white" strokeWidth={1} />
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="relative max-w-4xl mx-auto px-4 pt-8 pb-10">

        {linkedEvent && (
          <Link
            to={routes.event.view(linkedEvent.id)}
            className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20
                       backdrop-blur-sm px-3 py-1 text-[11px] font-semibold text-amber-100
                       hover:bg-white/20 transition-colors"
          >
            <CalendarDays size={10} />
            {linkedEvent.event_name}
          </Link>
        )}

        <h1 className="text-3xl lg:text-4xl font-black text-white leading-tight tracking-tight mb-1 drop-shadow-md">
          {meal.meal_name}
        </h1>

        {meal.description && (
          <p className="mt-1.5 mb-4 text-sm text-white/60 leading-relaxed max-w-xl">
            {meal.description}
          </p>
        )}

        {/* Stat chips */}
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="flex items-center gap-1.5 rounded-xl bg-black/25 backdrop-blur-sm border border-white/10 px-3 py-1.5 text-xs font-bold text-white">
            <Clock size={12} className="text-amber-300" />
            {formatDateTime(meal.time)}
          </span>
          {meal.location && (
            <span className="flex items-center gap-1.5 rounded-xl bg-black/25 backdrop-blur-sm border border-white/10 px-3 py-1.5 text-xs font-bold text-white">
              <MapPin size={12} className="text-amber-300" />
              {meal.location}
            </span>
          )}
          {meal.cost > 0 && (
            <span className="flex items-center gap-1.5 rounded-xl bg-black/25 backdrop-blur-sm border border-white/10 px-3 py-1.5 text-xs font-bold text-white">
              <Banknote size={12} className="text-emerald-300" />
              €{meal.cost.toFixed(2)} p.p.
            </span>
          )}
          {meal.transport_needed && (
            <span className="flex items-center gap-1.5 rounded-xl bg-sky-500/40 backdrop-blur-sm border border-sky-300/20 px-3 py-1.5 text-xs font-bold text-white">
              <Bus size={12} />
              Vervoer nodig
            </span>
          )}
        </div>

        {/* Attendees strip */}
        {participants.length > 0 && (
          <div className="mt-5 flex items-center gap-3">
            <div className="flex -space-x-2">
              {participants.slice(0, 6).map((p) => {
                const u = resolveUser(p);
                return (
                  <UserAvatar
                    key={p}
                    name={u?.name ?? p}
                    user={u}
                    className="h-7 w-7 text-[10px] ring-2 ring-black/30"
                  />
                );
              })}
            </div>
            <span className="text-xs font-semibold text-white/70">
              <span className="font-black text-white">{participants.length}</span>{" "}
              {participants.length === 1 ? "aanmelding" : "aanmeldingen"}
            </span>
          </div>
        )}
      </div>

      {/* Bottom fade into page bg */}
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-50 dark:from-slate-950 to-transparent pointer-events-none" />
    </div>
  );
}
