import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Car, Users } from "lucide-react";
import { routes } from "../../config/routes";
import { guessQuickRideDirection } from "../../utils/quickRide";
import { tripIdOf } from "../../utils/trips";
import { QuickRideModal } from "../transport/QuickRideModal";
import { JoinRideModal } from "../transport/JoinRideModal";
import { RestaurantQuickDriverModal } from "../transport/RestaurantQuickDriverModal";
import type { CalendarEvent, Meal, Ride } from "../../types";

interface QuickRideTilesProps {
  /** The nearest upcoming event. */
  event: CalendarEvent;
  /** A meal later that day still needing transport — only ever set for a
   * non-hotel event (see HubPage). When present, the evening tile switches
   * over to the shared Restaurant-direction ride for it instead of the
   * regular hotel/home leg, since that's the more immediately relevant ride. */
  restaurantMeal?: Meal;
  rides?: Ride[];
}

function QuickTile({ icon, title, action, onClick }: { icon: React.ReactNode; title: string; action: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-3 rounded-xl border-1.5 border-line bg-surface p-3.5 text-left transition-colors hover:border-ink-3"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sunken text-ink">{icon}</span>
      <span>
        <span className="block text-[14px] font-semibold leading-tight text-ink">{title}</span>
        <span className="mt-1 block font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3">{action}</span>
      </span>
    </button>
  );
}

/** Two hub shortcuts for getting to/from the event, relabeled by time of day
 * — "naar hotel"/"naar congres" when the trip has a hotel leg, "naar
 * evenement"/"naar huis" when it doesn't, or "naar restaurant" in the
 * evening when there's a meal still needing a ride. */
export function QuickRideTiles({ event, restaurantMeal, rides = [] }: QuickRideTilesProps) {
  const navigate = useNavigate();
  const [offerOpen, setOfferOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [restaurantOfferOpen, setRestaurantOfferOpen] = useState(false);

  const direction = guessQuickRideDirection();
  const toHotel = direction === "Outbound";
  const isRestaurantLeg = toHotel && !!restaurantMeal;

  const label = isRestaurantLeg
    ? "naar restaurant"
    : event.is_hotel
      ? (toHotel ? "naar hotel" : "naar congres")
      : (toHotel ? "naar huis" : "naar evenement");

  const existingRestaurantRide = isRestaurantLeg
    ? rides.find((r) => r.direction === "Restaurant" && r.linked_meal_id === restaurantMeal!.id)
    : undefined;

  function handleOfferClick() {
    if (isRestaurantLeg) setRestaurantOfferOpen(true);
    else setOfferOpen(true);
  }

  function handleJoinClick() {
    if (!isRestaurantLeg) { setJoinOpen(true); return; }
    if (existingRestaurantRide) navigate(routes.ride.view(existingRestaurantRide.id));
    else navigate(routes.trip.view(tripIdOf(event), "transport"), { state: { tab: "Restaurant" } });
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <QuickTile icon={<Car size={16} />} title={`Rit ${label}`} action="Aanbieden" onClick={handleOfferClick} />
        <QuickTile icon={<Users size={16} />} title={`Meerijden ${label}`} action="Zoeken" onClick={handleJoinClick} />
      </div>

      {isRestaurantLeg ? (
        <RestaurantQuickDriverModal
          open={restaurantOfferOpen}
          onClose={() => setRestaurantOfferOpen(false)}
          event={event}
          meal={restaurantMeal!}
          existingRide={existingRestaurantRide}
        />
      ) : (
        <>
          <QuickRideModal
            open={offerOpen}
            onClose={() => setOfferOpen(false)}
            event={event}
            initialDirection={direction}
          />

          <JoinRideModal
            open={joinOpen}
            onClose={() => setJoinOpen(false)}
            event={event}
            initialDirection={direction}
            onOfferInstead={() => { setJoinOpen(false); setOfferOpen(true); }}
          />
        </>
      )}
    </>
  );
}
