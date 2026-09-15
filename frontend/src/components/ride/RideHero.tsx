import { useState } from "react";
import { Link } from "react-router-dom";
import { Car, Train, Truck, Clock, Timer, AlertCircle, CalendarDays, Users, Utensils, Plus, UserMinus } from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { UserProfilePopup, type AnchorRect } from "../common/UserProfilePopup";
import { useCalendar } from "../../hooks/useCalendar";
import { useAuthStore } from "../../store/auth.store";
import { getRideStatus, formatCountdown, rideLocationLabel } from "../../utils/rides";
import { routes } from "../../config/routes";
import type { CalendarEvent, Meal, Ride, User } from "../../types";

const CLOSED_RECT: AnchorRect = { top: 0, left: 0, right: 0, height: 0 };

/** White-ish mono chip on the ink hero. */
const CHIP =
  "inline-flex items-center gap-1.5 rounded-md border border-white/25 bg-white/10 px-2 py-[3px] font-mono text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#E6F0F3]";

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

/** Flat ink hero for a ride: route in the display face, mono chips, brand-blue "Stap in". */
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
    <section
      className={`overflow-hidden rounded-[14px] border-2 border-outline bg-[#0F1519] text-[#E6F0F3] ${isRecent || isPast ? "opacity-80" : ""}`}
    >
      <div className="px-5 py-5 sm:px-7 sm:py-6">

        {/* Action required */}
        {ride.action_required && !isPast && (
          <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-amber-300/40 bg-amber-400/15 px-2.5 py-1.5 text-xs font-semibold text-amber-200">
            <AlertCircle size={13} className="shrink-0" />
            Actie vereist — bekijk de passagierslijst
          </div>
        )}

        {/* Chips row */}
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          {linkedMeal && (
            <Link to={routes.meal.view(linkedMeal.id)} className={`${CHIP} transition-colors hover:bg-white/20`}>
              <Utensils size={11} />
              {linkedMeal.meal_name}
            </Link>
          )}
          {linkedEvent && !linkedMeal && (
            <Link to={routes.event.view(linkedEvent.id)} className={`${CHIP} transition-colors hover:bg-white/20`}>
              <CalendarDays size={11} />
              {linkedEvent.event_name}
            </Link>
          )}
          <span className={CHIP}>
            <TransportIcon size={11} />
            {isPT ? "Openbaar vervoer" : ride.direction === "Inbound" ? "Heen" : ride.direction === "Outbound" ? "Terug" : "Restaurant"}
          </span>
          {!isPT && !isRecent && !isPast && ride.direction !== "Restaurant" && (
            <span
              className={
                ride.is_full
                  ? "inline-flex items-center gap-1.5 rounded-md border border-rose-300/40 bg-rose-500/20 px-2 py-[3px] font-mono text-[10.5px] font-semibold uppercase tracking-[0.05em] text-rose-200"
                  : CHIP
              }
            >
              <Users size={11} />
              {ride.is_full
                ? "Vol"
                : `${ride.seats_left} ${ride.seats_left === 1 ? "plek" : "plekken"} vrij`}
            </span>
          )}
        </div>

        {/* Route: from (small) → to (title) */}
        <div className="grid grid-cols-[12px_minmax(0,1fr)] gap-x-3">
          <i aria-hidden className="mt-[5px] block h-[11px] w-[11px] rounded-full border-2 border-[#E6F0F3]" />
          <div className="min-w-0">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-white/55">Van</p>
            <p className="truncate text-[15px] font-semibold text-white/85">{fromLabel}</p>
          </div>
          <i aria-hidden className="ml-[4.5px] my-1 block h-4 w-0.5 bg-white/25" />
          <span aria-hidden />
          <i aria-hidden className="mt-[5px] block h-[11px] w-[11px] rounded-full border-2 border-[#E6F0F3] bg-[#E6F0F3]" />
          <div className="min-w-0">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-white/55">Naar</p>
            <h1
              className={`break-words font-display font-extrabold uppercase leading-[0.95] tracking-[0.005em] ${
                toIsPlaceholder ? "text-[26px] text-white/55 sm:text-[30px]" : "text-[34px] text-[#E6F0F3] sm:text-[42px]"
              }`}
            >
              {toLabel}
            </h1>
          </div>
        </div>

        {/* Countdown */}
        {(status === "urgent" || status === "soon" || status === "recent") && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            <span
              className={
                status === "urgent"
                  ? "inline-flex items-center gap-1.5 rounded-md border border-rose-300/40 bg-rose-500/20 px-2 py-[3px] font-mono text-[10.5px] font-semibold uppercase tracking-[0.05em] text-rose-200"
                  : status === "soon"
                    ? "inline-flex items-center gap-1.5 rounded-md border border-amber-300/40 bg-amber-400/15 px-2 py-[3px] font-mono text-[10.5px] font-semibold uppercase tracking-[0.05em] text-amber-200"
                    : CHIP
              }
            >
              {status === "recent" ? <Clock size={11} /> : <Timer size={11} />}
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
              className="h-9 w-9 text-xs !border-[#0F1519]"
            />
            <div className="leading-tight">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-white/55">
                {ride.direction === "Restaurant" ? "Organisator" : "Chauffeur"}
              </p>
              <p className="text-sm font-semibold text-[#E6F0F3]">{ride.driver}</p>
            </div>
          </div>
        )}

        {/* Passengers + sign-up */}
        {showSignup && (
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-dashed border-white/20 pt-4">
            {ride.passengers.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {ride.passengers.slice(0, 8).map((p) => {
                    const u = resolveUser(p);
                    return u ? (
                      <button key={p} type="button" onClick={(e) => openPopup(u, e)} className="rounded-full" aria-label={u.name}>
                        <UserAvatar
                          name={u.name}
                          user={u}
                          className="h-8 w-8 text-[10px] !border-[#0F1519]"
                        />
                      </button>
                    ) : (
                      <UserAvatar
                        key={p}
                        name={p}
                        className="h-8 w-8 text-[10px] !border-[#0F1519]"
                      />
                    );
                  })}
                </div>
                <p className="text-sm text-white/65">
                  <span className="font-mono font-semibold tabular-nums text-[#E6F0F3]">{ride.passengers.length}</span>{" "}
                  {ride.passengers.length === 1 ? "meerijder" : "meerijders"}
                </p>
              </div>
            )}
            {canAct && (
              <div className="ml-auto flex items-center gap-2">
                {onLeaveClick && ride.passengers.length > 0 && (
                  <button
                    type="button"
                    onClick={onLeaveClick}
                    className="flex items-center gap-1.5 rounded-xl border-1.5 border-white/25 px-3 py-2 text-xs font-semibold text-[#E6F0F3] transition-colors hover:border-white/50"
                  >
                    <UserMinus size={13} /> Uitstappen
                  </button>
                )}
                {onClaimClick && !ride.is_full && (
                  <button
                    type="button"
                    onClick={onClaimClick}
                    className="btn-primary px-3.5 py-2 text-xs"
                  >
                    <Plus size={13} /> Stap in
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <UserProfilePopup
        user={popupUser}
        open={popupUser !== null}
        isOwn={currentUser === popupUser?.id}
        anchorRect={popupAnchorRect}
        onClose={() => setPopupUser(null)}
        calendarEvents={calendarEvents}
      />
    </section>
  );
}
