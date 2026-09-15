import { motion } from "framer-motion";
import { Car, Truck, X, ArrowRight } from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { SeatDots } from "../transport/SeatDots";
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="card-surface flex flex-col gap-3 p-3.5"
    >
      {/* Driver row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <UserAvatar name={driver.name} className="h-8 w-8 shrink-0 text-[11px]" />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-ink">{driver.name}</p>
            <div className="mt-0.5 flex items-center gap-1 text-[11.5px] text-ink-3">
              <CarIcon size={12} className="shrink-0" />
              <span>Chauffeur</span>
            </div>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${
          isFull
            ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
        }`}>
          {isFull ? "Vol" : `${spotsLeft} vrij`}
        </span>
      </div>

      {/* Capacity: seat squares */}
      <div className="flex items-center gap-2">
        <SeatDots total={driver.seats} left={Math.max(0, spotsLeft)} />
        <span className="font-mono text-[11px] font-semibold tabular-nums text-ink-3">
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
              className="group inline-flex items-center gap-1 rounded-full border-1.5 border-line px-2 py-1 text-xs font-medium text-ink-2 transition-colors hover:border-rose-300 hover:text-rose-700 disabled:cursor-default disabled:opacity-60 dark:hover:border-rose-400/40 dark:hover:text-rose-300"
            >
              <UserAvatar name={pax} className="h-4 w-4 shrink-0 text-[8px] !border-0" />
              {pax}
              {canAct && <X size={10} className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-ink-3">Nog niemand ingestapt</p>
      )}

      {/* Stap in — full width at bottom */}
      {canAct && !isFull && (
        <div className="border-t border-dashed border-line pt-3">
          <button
            onClick={() => onJoin(driver.name)}
            disabled={isPending}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border-1.5 border-line bg-surface py-2.5 text-xs font-semibold text-ink transition-colors hover:border-ink-3 disabled:opacity-50"
          >
            Stap in <ArrowRight size={12} />
          </button>
        </div>
      )}
    </motion.div>
  );
}
