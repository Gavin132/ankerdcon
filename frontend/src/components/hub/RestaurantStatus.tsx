import { motion } from "framer-motion";
import { Utensils, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { routes } from "../../config/routes";
import { avatarColor } from "../../utils/avatar";
import { parseRestaurantDrivers, getRideStatus } from "../../utils/rides";
import { formatDateTime } from "../../utils/format";
import { listItem } from "../../utils/motion";
import type { Ride } from "../../types";

interface RestaurantStatusProps {
  rides: Ride[];
}

export function RestaurantStatus({ rides }: RestaurantStatusProps) {
  const navigate = useNavigate();

  const relevant = rides
    .filter((r) => r.direction === "Restaurant")
    .map((ride) => {
      const { status } = getRideStatus(ride.departure_time);
      if (status === "past") return null;

      const drivers = parseRestaurantDrivers(ride.parking_info);
      const driverNames = new Set(drivers.map((d) => d.name));
      const assignedPax = new Set(drivers.flatMap((d) => d.passengers));
      const unassigned = ride.passengers.filter(
        (a) => !driverNames.has(a) && !assignedPax.has(a),
      );
      const totalCapacity = drivers.reduce((s, d) => s + d.seats, 0);
      const allClear = drivers.length > 0 && ride.passengers.length > 0 && unassigned.length === 0;

      return { ride, drivers, unassigned, totalCapacity, allClear };
    })
    .filter(Boolean) as {
      ride: Ride;
      drivers: ReturnType<typeof parseRestaurantDrivers>;
      unassigned: string[];
      totalCapacity: number;
      allClear: boolean;
    }[];

  if (relevant.length === 0) return null;

  return (
    <motion.div variants={listItem}>
      <p className="section-label mb-3 flex items-center gap-2">
        <Utensils size={13} className="text-amber-500" />
        Restaurant ritten
      </p>
      <div className="space-y-2">
        {relevant.map(({ ride, drivers, unassigned, totalCapacity, allClear }) => (
          <button
            key={ride.id}
            onClick={() => navigate(routes.transport)}
            className="w-full text-left"
          >
            <div className={`card-surface rounded-2xl overflow-hidden border-l-4 transition-opacity hover:opacity-90 ${
              unassigned.length > 0 ? "border-l-rose-400" : allClear ? "border-l-emerald-400" : "border-l-amber-400"
            }`}>
              {/* Status banner */}
              {unassigned.length > 0 && (
                <div className="flex items-center gap-2 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                  <AlertCircle size={11} />
                  {unassigned.length} {unassigned.length === 1 ? "persoon heeft" : "personen hebben"} nog geen rit
                </div>
              )}
              {allClear && (
                <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <CheckCircle2 size={11} />
                  Iedereen heeft een rit
                </div>
              )}

              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500">
                  <Utensils size={16} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-900 dark:text-white truncate">{ride.start_location}</p>
                  <p className="text-xs text-slate-400 font-medium">{formatDateTime(ride.departure_time)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {drivers.length > 0 && (
                    <span className={`text-xs font-bold rounded-lg px-2 py-1 ${
                      unassigned.length > 0
                        ? "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
                        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    }`}>
                      {ride.passengers.length - unassigned.length}/{totalCapacity}
                    </span>
                  )}
                  <ArrowRight size={14} className="text-slate-300" />
                </div>
              </div>

              {/* Unassigned people */}
              {unassigned.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                  {unassigned.map((name) => (
                    <div
                      key={name}
                      className="flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-100 px-2.5 py-1 dark:bg-rose-900/20 dark:border-rose-900/40"
                    >
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br text-[9px] font-black text-white ${avatarColor(name)}`}
                      >
                        {name[0].toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">{name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
