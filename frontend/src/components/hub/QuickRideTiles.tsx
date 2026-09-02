import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Car, Users } from "lucide-react";
import { routes } from "../../config/routes";
import { guessQuickRideDirection } from "../../utils/quickRide";
import { QuickRideModal } from "../transport/QuickRideModal";
import type { CalendarEvent } from "../../types";

interface QuickRideTilesProps {
  /** The nearest upcoming event — caller is responsible for only rendering
   * this when that event has `is_hotel` set. */
  event: CalendarEvent;
}

/** Two hub shortcuts for the hotel↔venue shuttle, relabeled by time of day. */
export function QuickRideTiles({ event }: QuickRideTilesProps) {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const direction = guessQuickRideDirection();
  const toHotel = direction === "Outbound";
  const label = toHotel ? "naar hotel" : "naar congres";

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
          onClick={() => navigate(routes.transport, { state: { tab: direction } })}
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

      <QuickRideModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        event={event}
        initialDirection={direction}
      />
    </>
  );
}
