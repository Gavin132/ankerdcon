import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Car, Users } from "lucide-react";
import { routes } from "../../config/routes";
import { guessQuickRideDirection } from "../../utils/quickRide";
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
    else navigate(routes.transport, { state: { tab: "Restaurant" } });
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <motion.button
          onClick={handleOfferClick}
          className="relative gradient-hero shadow-hero rounded-2xl overflow-hidden p-4 text-left flex flex-col gap-4 transition-colors duration-150 hover:bg-white/[0.04]"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.12 }}
        >
          <div className="pointer-events-none absolute -top-6 -right-6 h-20 w-20 rounded-full bg-sky-400/10" />
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-sky-400/15 border border-sky-400/25">
            <Car size={15} className="text-sky-300" />
          </div>
          <div className="relative">
            <p className="text-sm font-black text-white leading-tight">Rit {label}</p>
            <p className="text-xs font-semibold text-sky-300/60 mt-1">Aanbieden</p>
          </div>
        </motion.button>

        <motion.button
          onClick={handleJoinClick}
          className="relative gradient-hero shadow-hero rounded-2xl overflow-hidden p-4 text-left flex flex-col gap-4 transition-colors duration-150 hover:bg-white/[0.04]"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.12 }}
        >
          <div className="pointer-events-none absolute -top-6 -right-6 h-20 w-20 rounded-full bg-sky-400/10" />
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-sky-400/15 border border-sky-400/25">
            <Users size={15} className="text-sky-300" />
          </div>
          <div className="relative">
            <p className="text-sm font-black text-white leading-tight">Meerijden {label}</p>
            <p className="text-xs font-semibold text-sky-300/60 mt-1">Zoeken</p>
          </div>
        </motion.button>
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
