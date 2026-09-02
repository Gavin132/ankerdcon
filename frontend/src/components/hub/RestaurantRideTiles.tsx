import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Car, Users } from "lucide-react";
import { routes } from "../../config/routes";
import { RestaurantQuickDriverModal } from "../transport/RestaurantQuickDriverModal";
import type { CalendarEvent, Meal, Ride } from "../../types";

interface RestaurantRideTilesProps {
  event: CalendarEvent;
  meal: Meal;
  rides: Ride[];
}

/** Two hub shortcuts for a restaurant outing's shared ride — the counterpart
 * to QuickRideTiles for events without a hotel component. */
export function RestaurantRideTiles({ event, meal, rides }: RestaurantRideTilesProps) {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const existingRide = rides.find((r) => r.direction === "Restaurant" && r.linked_meal_id === meal.id);

  function openJoin() {
    if (existingRide) navigate(routes.ride.view(existingRide.id));
    else navigate(routes.transport, { state: { tab: "Restaurant" } });
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <motion.button
          onClick={() => setModalOpen(true)}
          className="relative gradient-hero shadow-hero rounded-2xl overflow-hidden p-4 text-left flex flex-col gap-4 transition-colors duration-150 hover:bg-white/[0.04]"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.12 }}
        >
          <div className="pointer-events-none absolute -top-6 -right-6 h-20 w-20 rounded-full bg-amber-400/10" />
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400/15 border border-amber-400/25">
            <Car size={15} className="text-amber-300" />
          </div>
          <div className="relative">
            <p className="text-sm font-black text-white leading-tight">Rit naar restaurant</p>
            <p className="text-xs font-semibold text-amber-300/70 mt-1">Aanbieden</p>
          </div>
        </motion.button>

        <motion.button
          onClick={openJoin}
          className="relative gradient-hero shadow-hero rounded-2xl overflow-hidden p-4 text-left flex flex-col gap-4 transition-colors duration-150 hover:bg-white/[0.04]"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.12 }}
        >
          <div className="pointer-events-none absolute -top-6 -right-6 h-20 w-20 rounded-full bg-amber-400/10" />
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400/15 border border-amber-400/25">
            <Users size={15} className="text-amber-300" />
          </div>
          <div className="relative">
            <p className="text-sm font-black text-white leading-tight">Meerijden naar restaurant</p>
            <p className="text-xs font-semibold text-amber-300/70 mt-1">Zoeken</p>
          </div>
        </motion.button>
      </div>

      <RestaurantQuickDriverModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        event={event}
        meal={meal}
        existingRide={existingRide}
      />
    </>
  );
}
