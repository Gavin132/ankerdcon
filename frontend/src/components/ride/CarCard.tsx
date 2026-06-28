import { motion } from "framer-motion";
import { Car, Truck, X, ArrowRight } from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import type { RestaurantDriver } from "../../types";

interface CarCardProps {
  driver: RestaurantDriver;
  canAct: boolean;
  onJoin: (driverName: string) => void;
  onUnassign: (userName: string) => void;
  isPending: boolean;
}

export function CarCard({ driver, canAct, onJoin, onUnassign, isPending }: CarCardProps) {
  const spotsLeft = driver.seats - driver.passengers.length;
  const isFull = spotsLeft <= 0;
  const isTimo = driver.name.trim().toLowerCase().startsWith("timo");
  const CarIcon = isTimo ? Truck : Car;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="card-surface rounded-2xl overflow-hidden"
    >
      {/* Accent bar */}
      <div className={`h-1 ${isFull ? "bg-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-600" : "bg-gradient-to-r from-amber-400 to-orange-400"}`} />

      <div className="px-4 py-4 space-y-3">
        {/* Driver row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <UserAvatar name={driver.name} className="h-9 w-9 text-xs shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{driver.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <CarIcon size={10} className="text-amber-500 shrink-0" />
                <span className="text-[11px] text-slate-400">Chauffeur</span>
              </div>
            </div>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
            isFull
              ? "bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400"
              : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
          }`}>
            {isFull ? "Vol" : `${spotsLeft} vrij`}
          </span>
        </div>

        {/* Capacity */}
        <div className="flex items-center gap-1.5">
          <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isFull ? "bg-rose-400" : "bg-amber-400"}`}
              style={{ width: `${(driver.passengers.length / driver.seats) * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-semibold text-slate-400 shrink-0">
            {driver.passengers.length}/{driver.seats}
          </span>
        </div>

        {/* Passengers */}
        {driver.passengers.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {driver.passengers.map((pax) => (
              <button
                key={pax}
                onClick={() => canAct && onUnassign(pax)}
                disabled={!canAct || isPending}
                title={canAct ? "Klik om te verwijderen" : undefined}
                className="group inline-flex items-center gap-1 rounded-full bg-sky-100 dark:bg-sky-900/30 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:text-sky-300 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-900/30 dark:hover:text-rose-400 transition-colors disabled:cursor-default disabled:opacity-60"
              >
                <UserAvatar name={pax} className="h-4 w-4 text-[8px] !border-0 shrink-0" />
                {pax}
                {canAct && <X size={9} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Nog niemand ingestapt</p>
        )}

        {/* Stap in — full width at bottom */}
        {canAct && !isFull && (
          <button
            onClick={() => onJoin(driver.name)}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 py-2.5 text-xs font-bold text-white transition-colors disabled:opacity-50"
          >
            Stap in <ArrowRight size={12} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
