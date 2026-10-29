import { Link } from "react-router-dom";
import { Clock, Timer, CalendarDays, MapPin, Users, Utensils, Plus, UserMinus, AlertCircle } from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { HeroActions, HeroChip, HeroPrimaryButton, HeroSecondaryButton, heroChipClass } from "../common/HeroActions";
import { HeroPeople } from "../common/HeroPeople";
import { useCurrentUser } from "../../hooks/useUsers";
import { useIsViewer } from "../../hooks/useIsViewer";
import { useIsOnList } from "../../hooks/useIsOnList";
import { findUser } from "../../utils/people";
import { formatDateTime } from "../../utils/format";
import { getRideStatus, formatCountdown, rideLocationLabel, rideVehicleIcon } from "../../utils/rides";
import { routes } from "../../config/routes";
import type { CalendarEvent, Meal, Ride, User } from "../../types";

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

/** Flat ink hero for a ride: chips, the route in the display face, the driver, and the sign-up row. */
export function RideHero({ ride, linkedEvent, linkedMeal, users, onClaimClick, onLeaveClick }: RideHeroProps) {
  const viewer = useIsViewer();
  const { data: me } = useCurrentUser();
  const onRide = useIsOnList(ride.passengers);
  const { status, minutesUntil } = getRideStatus(ride.departure_time);
  const isPT = ride.is_public_transport;
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

  // A viewer (read-only member) sees who is in the car, but gets no buttons.
  const canAct = status !== "recent" && status !== "past" && !viewer;
  const showSignup = !isRestaurant && (onClaimClick || onLeaveClick) && (ride.passengers.length > 0 || canAct);
  // "Uitstappen" is for someone on the ride (or an admin, who sorts out other people's rides).
  const canLeave = !!onLeaveClick && ride.passengers.length > 0 && (onRide || !!me?.is_admin);

  // One status chip at a time, the most pressing first: leaving now > leaving soon > gone > something to do.
  const statusChip: { tone: "neutral" | "warn" | "bad"; icon: React.ReactNode; text: string } | null =
    status === "urgent"
      ? { tone: "bad", icon: <Timer size={11} />, text: `Vertrekt over ${formatCountdown(minutesUntil)}!` }
      : status === "soon"
        ? { tone: "warn", icon: <Timer size={11} />, text: `Vertrekt over ${formatCountdown(minutesUntil)}` }
        : isRecent
          ? { tone: "neutral", icon: <Clock size={11} />, text: "Vertrokken" }
          : ride.action_required && !isPast
            ? { tone: "warn", icon: <AlertCircle size={11} />, text: "Actie vereist" }
            : null;

  return (
    <section
      className={`overflow-hidden rounded-hero border-2 border-outline bg-hero text-hero-ink ${isRecent || isPast ? "opacity-80" : ""}`}
    >
      <div className="px-5 py-5 sm:px-7 sm:py-6">
        {/* Chips: what it belongs to, which way, when, and at most one status. */}
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          {linkedMeal && (
            <Link to={routes.meal.view(linkedMeal.id)} className={`hit-area ${heroChipClass()} transition-colors hover:bg-hero-ink/20`}>
              <Utensils size={11} />
              {linkedMeal.meal_name}
            </Link>
          )}
          {linkedEvent && !linkedMeal && (
            <Link to={routes.event.view(linkedEvent.id)} className={`hit-area ${heroChipClass()} transition-colors hover:bg-hero-ink/20`}>
              <CalendarDays size={11} />
              {linkedEvent.event_name}
            </Link>
          )}
          {/* A restaurant ride with its meal already says what it is; the chip is for one without. */}
          {!(isRestaurant && linkedMeal) && (
            <HeroChip>
              <TransportIcon size={smallVehicle ? 9 : 11} />
              {isPT ? "Openbaar vervoer" : isInbound ? "Heen" : ride.direction === "Outbound" ? "Terug" : "Restaurant"}
            </HeroChip>
          )}
          <HeroChip className="normal-case tracking-normal">
            <Clock size={11} />
            {formatDateTime(ride.departure_time)}
          </HeroChip>
          {!isPT && !isRestaurant && !isRecent && !isPast && !ride.is_full && (
            <HeroChip>
              <Users size={11} />
              {`${ride.seats_left} ${ride.seats_left === 1 ? "plek" : "plekken"} vrij`}
            </HeroChip>
          )}
          {statusChip && (
            <HeroChip tone={statusChip.tone}>
              {statusChip.icon}
              {statusChip.text}
            </HeroChip>
          )}
        </div>

        {isRestaurant ? (
          <div className="min-w-0">
            <h1 className="line-clamp-3 break-words font-display text-[30px] font-extrabold uppercase leading-[0.95] tracking-[0.005em] text-hero-ink sm:line-clamp-none sm:text-[42px]">
              {restaurantTitle}
            </h1>
            {restaurantPlace !== restaurantTitle && (
              <p className="mt-2 flex items-start gap-1.5 text-sm leading-snug text-hero-ink/75">
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
              <p className="label-quiet text-hero-ink/70">Van</p>
              <p className="truncate text-[15px] font-semibold text-hero-ink/90">{fromLabel}</p>
            </div>
            <i aria-hidden className="ml-[4.5px] my-1 block h-4 w-0.5 bg-hero-ink/25" />
            <span aria-hidden />
            <i aria-hidden className="mt-[5px] block h-[11px] w-[11px] rounded-full border-2 border-hero-ink bg-hero-ink" />
            <div className="min-w-0">
              <p className="label-quiet text-hero-ink/70">Naar</p>
              <h1
                className={`line-clamp-3 break-words font-display font-extrabold uppercase leading-[0.95] tracking-[0.005em] sm:line-clamp-none ${
                  toIsPlaceholder ? "text-[26px] text-hero-ink/70 sm:text-[30px]" : "text-[30px] text-hero-ink sm:text-[42px]"
                }`}
              >
                {toLabel}
              </h1>
            </div>
          </div>
        )}

        {/* Driver (a restaurant ride has several cars, listed below) */}
        {!isPT && !isRestaurant && ride.driver && (
          <div className="mt-5 flex items-center gap-2.5">
            <UserAvatar
              name={ride.driver}
              user={findUser(users, ride.driver)}
              className="h-9 w-9 text-xs !border-hero"
            />
            <div className="leading-tight">
              <p className="label-quiet text-hero-ink/70">Chauffeur</p>
              <p className="text-sm font-semibold text-hero-ink">{ride.driver}</p>
            </div>
          </div>
        )}

        {/* Passengers + sign-up */}
        {showSignup && (
          <HeroPeople names={ride.passengers} singular="meerijder" plural="meerijders">
            {canAct && (
              <HeroActions>
                {canLeave && (
                  <HeroSecondaryButton onClick={onLeaveClick}>
                    <UserMinus size={14} /> Uitstappen
                  </HeroSecondaryButton>
                )}
                {onClaimClick && !ride.is_full && (
                  <HeroPrimaryButton onClick={onClaimClick}>
                    <Plus size={14} /> Stap in
                  </HeroPrimaryButton>
                )}
                {ride.is_full && <p className="text-xs text-hero-ink/75">Deze rit zit vol</p>}
              </HeroActions>
            )}
          </HeroPeople>
        )}
      </div>
    </section>
  );
}
