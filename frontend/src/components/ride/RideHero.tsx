import { useState } from "react";
import { Link } from "react-router-dom";
import { Car, Train, Truck, Clock, Timer, AlertCircle, CalendarDays, Users, ArrowRight, Utensils, Plus, UserMinus } from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { UserProfilePopup, type AnchorRect } from "../common/UserProfilePopup";
import { useCalendar } from "../../hooks/useCalendar";
import { useAuthStore } from "../../store/auth.store";
import { getRideStatus, formatCountdown, rideLocationLabel } from "../../utils/rides";
import { routes } from "../../config/routes";
import type { CalendarEvent, Meal, Ride, User } from "../../types";

const CLOSED_RECT: AnchorRect = { top: 0, left: 0, right: 0, height: 0 };

interface RideHeroProps {
  ride: Ride;
  linkedEvent?: CalendarEvent;
  linkedMeal?: Meal;
  users: User[];
  /** Omit both on a Restaurant-direction ride — that one has its own
   * multi-driver sign-up flow instead of a simple claim/leave. */
  onClaimClick?: () => void;
  onLeaveClick?: () => void;
}

export function RideHero({ ride, linkedEvent, linkedMeal, users, onClaimClick, onLeaveClick }: RideHeroProps) {
  const { data: calendarEvents } = useCalendar();
  const currentUser = useAuthStore((s) => s.currentUser);
  const [popupUser, setPopupUser] = useState<User | null>(null);
  const [popupAnchorRect, setPopupAnchorRect] = useState<AnchorRect>(CLOSED_RECT);
  const { status, minutesUntil } = getRideStatus(ride.departure_time);
  const isPT = ride.is_public_transport;
  const isTimo = ride.driver.trim().toLowerCase().startsWith("timo");
  const isRecent = status === "recent";
  const isPast = status === "past";

  const isInbound = ride.direction === "Inbound";
  const isRestaurant = ride.direction === "Restaurant";
  const fromLabel = rideLocationLabel(ride.start_location, linkedEvent, "Onbekende locatie");
  // A restaurant ride's destination is always the linked meal's own location —
  // there's no separate "end_location" input for these, so derive it here
  // instead of falling back to a generic placeholder.
  const toLabel = isRestaurant
    ? linkedMeal?.location || "Onbekende locatie"
    : rideLocationLabel(ride.end_location, linkedEvent, isInbound ? "Con locatie" : "Bestemming");
  const toIsPlaceholder = isRestaurant ? !linkedMeal?.location : !ride.end_location;

  const TransportIcon = isPT ? Train : isTimo ? Truck : Car;

  // Colors per status
  const bgGradient = isPT
    ? { from: "#4c1d95", mid: "#5b21b6", to: "#6d28d9" }
    : status === "urgent"
      ? { from: "#7f1d1d", mid: "#991b1b", to: "#be123c" }
      : status === "soon"
        ? { from: "#78350f", mid: "#92400e", to: "#b45309" }
        : isRecent || isPast
          ? { from: "#0f172a", mid: "#1e293b", to: "#334155" }
          : { from: "#0c4a6e", mid: "#075985", to: "#0369a1" };

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

  const canAct = status !== "recent" && status !== "past";
  const showSignup = !isRestaurant && (onClaimClick || onLeaveClick);

  return (
    <div
      className={`relative overflow-hidden ${isRecent || isPast ? "opacity-80" : ""}`}
      style={{ minHeight: 240 }}
    >
      {/* ── Cinematic layered background ────────────────────────────── */}
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
        <filter id="ride-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#ride-noise)" />
      </svg>
      {/* Road line pattern */}
      <svg className="absolute bottom-0 left-0 right-0 opacity-[0.07] pointer-events-none" height="80" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 400 80">
        <line x1="200" y1="0" x2="200" y2="80" stroke="white" strokeWidth="8" strokeDasharray="12 10" />
        <line x1="0" y1="40" x2="400" y2="40" stroke="white" strokeWidth="2" />
      </svg>
      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
      {/* Transport icon watermark */}
      <div className="absolute -right-6 top-1/2 -translate-y-1/2 opacity-[0.07] pointer-events-none">
        <TransportIcon size={160} strokeWidth={1} className="text-white" />
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="relative max-w-4xl mx-auto px-4 pt-8 pb-10">

        {/* Action required banner */}
        {ride.action_required && !isPast && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-500/20 border border-amber-400/30 backdrop-blur-sm px-3 py-2 text-xs font-bold text-amber-200">
            <AlertCircle size={13} />
            Actie vereist — bekijk de passagierslijst
          </div>
        )}

        {/* Linked event */}
        {/* Chips row */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {linkedMeal && (
            <Link
              to={routes.meal.view(linkedMeal.id)}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20
                         backdrop-blur-sm px-3 py-1 text-[11px] font-semibold text-white/80
                         hover:bg-white/20 transition-colors"
            >
              <Utensils size={10} />
              {linkedMeal.meal_name}
            </Link>
          )}
          {linkedEvent && !linkedMeal && (
            <Link
              to={routes.event.view(linkedEvent.id)}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20
                         backdrop-blur-sm px-3 py-1 text-[11px] font-semibold text-white/80
                         hover:bg-white/20 transition-colors"
            >
              <CalendarDays size={10} />
              {linkedEvent.event_name}
            </Link>
          )}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm px-3 py-1 text-[11px] font-semibold text-white/80">
            <TransportIcon size={10} />
            {isPT ? "Openbaar vervoer" : ride.direction === "Inbound" ? "Heen" : ride.direction === "Outbound" ? "Terug" : "Restaurant"}
          </div>
          {!isPT && !isRecent && !isPast && ride.direction !== "Restaurant" && (
            <div className={`inline-flex items-center gap-1.5 rounded-full backdrop-blur-sm border px-3 py-1 text-[11px] font-bold ${
              ride.is_full
                ? "bg-rose-900/50 border-rose-500/20 text-rose-200"
                : "bg-white/10 border-white/15 text-white/80"
            }`}>
              <Users size={10} />
              {ride.is_full
                ? "Vol"
                : `${ride.seats_left} ${ride.seats_left === 1 ? "plek" : "plekken"} vrij`}
            </div>
          )}
        </div>

        {/* Route: FROM → TO */}
        <div className="flex items-center gap-3 mb-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white/50 mb-0.5 uppercase tracking-wider">Van</p>
            <p className="text-lg font-bold text-white/80 truncate">{fromLabel}</p>
          </div>
          <ArrowRight size={20} className="text-white/30 shrink-0 mt-4" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white/50 mb-0.5 uppercase tracking-wider">Naar</p>
            <p className={`leading-tight truncate ${toIsPlaceholder ? "text-lg lg:text-xl font-semibold italic text-white/50" : "text-2xl lg:text-3xl font-black text-white drop-shadow-md"}`}>
              {toLabel}
            </p>
          </div>
        </div>

        {/* Stat chips */}
        {(status === "urgent" || status === "soon" || status === "recent") && (
          <div className="flex flex-wrap gap-2">
            <span className={`flex items-center gap-1.5 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1.5 text-xs font-bold text-white ${
              status === "urgent" ? "animate-pulse" : ""
            }`}>
              {status === "recent" ? <Clock size={12} /> : <Timer size={12} />}
              {status === "urgent" && `Vertrekt over ${formatCountdown(minutesUntil)}!`}
              {status === "soon" && `Vertrekt over ${formatCountdown(minutesUntil)}`}
              {status === "recent" && "Vertrokken"}
            </span>
          </div>
        )}

        {/* Driver / Organizer */}
        {!isPT && (
          <div className="mt-5 flex items-center gap-2.5">
            <UserAvatar
              name={ride.driver}
              user={resolveUser(ride.driver)}
              className="h-9 w-9 text-xs ring-2 ring-white/20"
            />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                {ride.direction === "Restaurant" ? "Organisator" : "Chauffeur"}
              </p>
              <p className="text-sm font-bold text-white">{ride.driver}</p>
            </div>
          </div>
        )}

        {/* Passengers + sign-up */}
        {showSignup && (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {ride.passengers.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2.5">
                  {ride.passengers.slice(0, 8).map((p) => {
                    const u = resolveUser(p);
                    return u ? (
                      <button key={p} type="button" onClick={(e) => openPopup(u, e)}>
                        <UserAvatar
                          name={u.name}
                          user={u}
                          className="h-8 w-8 text-[10px] ring-2 ring-black/30 hover:ring-white/40 transition-all"
                        />
                      </button>
                    ) : (
                      <UserAvatar
                        key={p}
                        name={p}
                        className="h-8 w-8 text-[10px] ring-2 ring-black/30"
                      />
                    );
                  })}
                </div>
                <p className="text-sm text-white/60">
                  <span className="font-black text-white">{ride.passengers.length}</span>{" "}
                  {ride.passengers.length === 1 ? "meerijder" : "meerijders"}
                </p>
              </div>
            )}
            {canAct && (
              <div className="flex items-center gap-2 ml-auto">
                {onLeaveClick && ride.passengers.length > 0 && (
                  <button
                    type="button"
                    onClick={onLeaveClick}
                    className="flex items-center gap-1.5 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-2 text-xs font-bold text-white/80 hover:bg-black/50 hover:border-white/20 active:scale-[0.97] transition-all"
                  >
                    <UserMinus size={13} /> Uitstappen
                  </button>
                )}
                {onClaimClick && !ride.is_full && (
                  <button
                    type="button"
                    onClick={onClaimClick}
                    className="flex items-center gap-1.5 rounded-xl gradient-brand px-3.5 py-2 text-xs font-bold text-white hover:opacity-90 active:scale-[0.97] transition-all"
                  >
                    <Plus size={13} /> Stap in
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom fade */}
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
