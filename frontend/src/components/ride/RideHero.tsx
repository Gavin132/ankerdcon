import { useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Timer, AlertCircle, CalendarDays, MapPin, Users, Utensils, Plus, UserMinus } from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { HeroActions, HeroChip, HeroPrimaryButton, HeroSecondaryButton, heroChipClass } from "../common/HeroActions";
import { UserProfilePopup, type AnchorRect } from "../common/UserProfilePopup";
import { useCalendar } from "../../hooks/useCalendar";
import { useAuthStore } from "../../store/auth.store";
import { useIsViewer } from "../../hooks/useIsViewer";
import { groupPeople } from "../../utils/people";
import { getRideStatus, formatCountdown, rideLocationLabel, rideVehicleIcon } from "../../utils/rides";
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

/** Flat ink hero for a ride: route in the display face, mono chips, brand-blue "Stap in". */
export function RideHero({ ride, linkedEvent, linkedMeal, users, onClaimClick, onLeaveClick }: RideHeroProps) {
  const { data: calendarEvents } = useCalendar();
  const currentUser = useAuthStore((s) => s.currentUser);
  const viewer = useIsViewer();
  const [popupUser, setPopupUser] = useState<User | null>(null);
  const [popupAnchorRect, setPopupAnchorRect] = useState<AnchorRect>(CLOSED_RECT);
  const { status, minutesUntil } = getRideStatus(ride.departure_time);
  const isPT = ride.is_public_transport;
  // One entry per person, not per name they are on the list under (utils/people.ts).
  const passengers = groupPeople(ride.passengers, users).map((person) => person.name);
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
  // A restaurant ride has no route: it is "the way to the meal". The meal is the title, its place a small line under it.
  const restaurantTitle = linkedMeal?.meal_name ?? ride.start_location;
  const restaurantPlace = linkedMeal?.location || ride.start_location;

  const { Icon: TransportIcon, small: smallVehicle } = rideVehicleIcon(ride.driver, users, ride.total_seats, isPT);

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

  // A viewer (read-only member) sees who is in the car, but gets no buttons.
  const canAct = status !== "recent" && status !== "past" && !viewer;
  const showSignup = !isRestaurant && (onClaimClick || onLeaveClick) && (ride.passengers.length > 0 || canAct);

  return (
    <section
      className={`overflow-hidden rounded-[14px] border-2 border-outline bg-hero text-hero-ink ${isRecent || isPast ? "opacity-80" : ""}`}
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
            <Link to={routes.meal.view(linkedMeal.id)} className={`${heroChipClass()} transition-colors hover:bg-white/20`}>
              <Utensils size={11} />
              {linkedMeal.meal_name}
            </Link>
          )}
          {linkedEvent && !linkedMeal && (
            <Link to={routes.event.view(linkedEvent.id)} className={`${heroChipClass()} transition-colors hover:bg-white/20`}>
              <CalendarDays size={11} />
              {linkedEvent.event_name}
            </Link>
          )}
          <HeroChip>
            <TransportIcon size={smallVehicle ? 9 : 11} />
            {isPT ? "Openbaar vervoer" : ride.direction === "Inbound" ? "Heen" : ride.direction === "Outbound" ? "Terug" : "Restaurant"}
          </HeroChip>
          {!isPT && !isRecent && !isPast && ride.direction !== "Restaurant" && (
            <HeroChip tone={ride.is_full ? "bad" : "neutral"}>
              <Users size={11} />
              {ride.is_full
                ? "Vol"
                : `${ride.seats_left} ${ride.seats_left === 1 ? "plek" : "plekken"} vrij`}
            </HeroChip>
          )}
        </div>

        {isRestaurant ? (
          <div className="min-w-0">
            <h1 className="break-words font-display text-[34px] font-extrabold uppercase leading-[0.95] tracking-[0.005em] text-hero-ink sm:text-[42px]">
              {restaurantTitle}
            </h1>
            {restaurantPlace !== restaurantTitle && (
              <p className="mt-2 flex items-start gap-1.5 text-sm leading-snug text-white/65">
                <MapPin size={14} className="mt-[3px] shrink-0" />
                {restaurantPlace}
              </p>
            )}
          </div>
        ) : (
          // Route: from (small) → to (title)
          <div className="grid grid-cols-[12px_minmax(0,1fr)] gap-x-3">
            <i aria-hidden className="mt-[5px] block h-[11px] w-[11px] rounded-full border-2 border-hero-ink" />
            <div className="min-w-0">
              <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-white/55">Van</p>
              <p className="truncate text-[15px] font-semibold text-white/85">{fromLabel}</p>
            </div>
            <i aria-hidden className="ml-[4.5px] my-1 block h-4 w-0.5 bg-white/25" />
            <span aria-hidden />
            <i aria-hidden className="mt-[5px] block h-[11px] w-[11px] rounded-full border-2 border-hero-ink bg-hero-ink" />
            <div className="min-w-0">
              <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-white/55">Naar</p>
              <h1
                className={`break-words font-display font-extrabold uppercase leading-[0.95] tracking-[0.005em] ${
                  toIsPlaceholder ? "text-[26px] text-white/55 sm:text-[30px]" : "text-[34px] text-hero-ink sm:text-[42px]"
                }`}
              >
                {toLabel}
              </h1>
            </div>
          </div>
        )}

        {/* Countdown */}
        {(status === "urgent" || status === "soon" || status === "recent") && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            <HeroChip tone={status === "urgent" ? "bad" : status === "soon" ? "warn" : "neutral"}>
              {status === "recent" ? <Clock size={11} /> : <Timer size={11} />}
              {status === "urgent" && `Vertrekt over ${formatCountdown(minutesUntil)}!`}
              {status === "soon" && `Vertrekt over ${formatCountdown(minutesUntil)}`}
              {status === "recent" && "Vertrokken"}
            </HeroChip>
          </div>
        )}

        {/* Driver / Organizer */}
        {!isPT && ride.driver && (
          <div className="mt-5 flex items-center gap-2.5">
            <UserAvatar
              name={ride.driver}
              user={resolveUser(ride.driver)}
              className="h-9 w-9 text-xs !border-hero"
            />
            <div className="leading-tight">
              <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-white/55">
                {ride.direction === "Restaurant" ? "Organisator" : "Chauffeur"}
              </p>
              <p className="text-sm font-semibold text-hero-ink">{ride.driver}</p>
            </div>
          </div>
        )}

        {/* Passengers + sign-up */}
        {showSignup && (
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-dashed border-white/20 pt-4">
            {ride.passengers.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {passengers.slice(0, 8).map((p) => {
                    const u = resolveUser(p);
                    return u ? (
                      <button key={p} type="button" onClick={(e) => openPopup(u, e)} className="rounded-full" aria-label={u.name}>
                        <UserAvatar
                          name={u.name}
                          user={u}
                          className="h-8 w-8 text-[12px] !border-hero"
                        />
                      </button>
                    ) : (
                      <UserAvatar
                        key={p}
                        name={p}
                        className="h-8 w-8 text-[12px] !border-hero"
                      />
                    );
                  })}
                </div>
                <p className="text-sm text-white/65">
                  <span className="font-mono font-semibold tabular-nums text-hero-ink">{passengers.length}</span>{" "}
                  {passengers.length === 1 ? "meerijder" : "meerijders"}
                </p>
              </div>
            )}
            {canAct && (
              <HeroActions>
                {onLeaveClick && ride.passengers.length > 0 && (
                  <HeroSecondaryButton onClick={onLeaveClick}>
                    <UserMinus size={14} /> Uitstappen
                  </HeroSecondaryButton>
                )}
                {onClaimClick && !ride.is_full && (
                  <HeroPrimaryButton onClick={onClaimClick}>
                    <Plus size={14} /> Stap in
                  </HeroPrimaryButton>
                )}
              </HeroActions>
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
