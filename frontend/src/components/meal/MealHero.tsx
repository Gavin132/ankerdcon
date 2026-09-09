import { useState } from "react";
import { Link } from "react-router-dom";
import { Clock, MapPin, Banknote, Bus, CalendarDays, UtensilsCrossed, UserCheck, UserMinus } from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { UserProfilePopup, type AnchorRect } from "../common/UserProfilePopup";
import { useCalendar } from "../../hooks/useCalendar";
import { useAuthStore } from "../../store/auth.store";
import { formatDateTime } from "../../utils/format";
import { routes } from "../../config/routes";
import type { CalendarEvent, Meal, User } from "../../types";

const CLOSED_RECT: AnchorRect = { top: 0, left: 0, right: 0, height: 0 };

interface MealHeroProps {
  meal: Meal;
  linkedEvent?: CalendarEvent;
  users: User[];
  onRsvpClick: () => void;
  onCancelClick: () => void;
}

export function MealHero({ meal, linkedEvent, users, onRsvpClick, onCancelClick }: MealHeroProps) {
  const { data: calendarEvents } = useCalendar();
  const currentUser = useAuthStore((s) => s.currentUser);
  const [popupUser, setPopupUser] = useState<User | null>(null);
  const [popupAnchorRect, setPopupAnchorRect] = useState<AnchorRect>(CLOSED_RECT);
  const participants = meal.participants ?? [];

  function resolveUser(stored: string) {
    return users.find(
      (u) =>
        u.name === stored ||
        u.discord_username === stored ||
        u.aliases?.includes(stored),
    );
  }

  function openPopup(user: User, e: React.MouseEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setPopupAnchorRect({ top: rect.top, left: rect.left, right: rect.right, height: rect.height });
    setPopupUser(user);
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

        {/* Attendees + sign-up */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {participants.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {participants.slice(0, 6).map((p) => {
                  const u = resolveUser(p);
                  return u ? (
                    <button key={p} type="button" onClick={(e) => openPopup(u, e)}>
                      <UserAvatar
                        name={u.name}
                        user={u}
                        className="h-7 w-7 text-[10px] ring-2 ring-black/30 hover:ring-white/40 transition-all"
                      />
                    </button>
                  ) : (
                    <UserAvatar
                      key={p}
                      name={p}
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
          <div className="flex items-center gap-2 ml-auto">
            {participants.length > 0 && (
              <button
                type="button"
                onClick={onCancelClick}
                className="flex items-center gap-1.5 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-2 text-xs font-bold text-white/80 hover:bg-black/50 hover:border-white/20 active:scale-[0.97] transition-all"
              >
                <UserMinus size={13} /> Afmelden
              </button>
            )}
            <button
              type="button"
              onClick={onRsvpClick}
              className="flex items-center gap-1.5 rounded-xl gradient-brand px-3.5 py-2 text-xs font-bold text-white hover:opacity-90 active:scale-[0.97] transition-all"
            >
              <UserCheck size={13} /> Aanmelden
            </button>
          </div>
        </div>
      </div>

      {/* Bottom fade into page bg */}
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-50 dark:from-slate-950 to-transparent pointer-events-none" />

      <UserProfilePopup
        user={popupUser}
        open={popupUser !== null}
        isOwn={currentUser === popupUser?.id}
        anchorRect={popupAnchorRect}
        onClose={() => setPopupUser(null)}
        calendarEvents={calendarEvents}
      />
    </div>
  );
}
