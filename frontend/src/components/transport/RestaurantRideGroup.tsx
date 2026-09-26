import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, Car, ChevronRight, Utensils } from "lucide-react";
import { CarCard } from "../ride/CarCard";
import { RestaurantQuickDriverModal } from "./RestaurantQuickDriverModal";
import { useMeals } from "../../hooks/useMeals";
import { useCalendar } from "../../hooks/useCalendar";
import { useRestaurantCars } from "../../hooks/useRestaurantCars";
import { formatTime } from "../../utils/format";
import { getRideStatus } from "../../utils/rides";
import { listItem } from "../../utils/motion";
import { routes } from "../../config/routes";
import type { Meal, Ride } from "../../types";

/**
 * A ride to a restaurant, in the Vervoer sheet: not one summary card but every
 * car going there as its own ride card — the same look as Heen and Terug — under
 * a small header naming the meal.
 */
export function RestaurantRideGroup({ ride, userNames }: { ride: Ride; userNames: string[] }) {
  const [driverOpen, setDriverOpen] = useState(false);
  const { data: meals = [] } = useMeals();
  const { data: events = [] } = useCalendar();

  const linkedMeal = ride.linked_meal_id ? meals.find((m) => m.id === ride.linked_meal_id) : undefined;
  const linkedEvent = linkedMeal?.linked_event_id ? events.find((e) => e.id === linkedMeal.linked_event_id) : undefined;
  const cars = useRestaurantCars(ride, linkedMeal);

  const { status } = getRideStatus(ride.departure_time);
  const canAct = status !== "past" && status !== "recent";

  const drivers = ride.restaurant_drivers ?? [];
  const driverNames = new Set(drivers.map((d) => d.name));
  const assignedPax = new Set(drivers.flatMap((d) => d.passengers));
  const unassigned = cars.attendees.filter((a) => !driverNames.has(a) && !assignedPax.has(a));
  const canOfferRide = canAct && !!linkedMeal && !!linkedEvent;

  return (
    <motion.div variants={listItem} className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Link
          to={linkedMeal ? routes.meal.view(linkedMeal.id) : routes.ride.view(ride.id)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg py-0.5 text-left transition-colors hover:text-ink"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sunken text-ink">
            <Utensils size={12} />
          </span>
          <span className="truncate text-[13px] font-semibold text-ink">{linkedMeal?.meal_name ?? "Restaurant"}</span>
          <span className="shrink-0 font-mono text-[12px] font-semibold tabular-nums text-ink-2">{formatTime(ride.departure_time)}</span>
          <ChevronRight size={13} className="shrink-0 text-ink-3" />
        </Link>
        {canOfferRide && (
          <button type="button" onClick={() => setDriverOpen(true)} className="btn-primary h-8 shrink-0 px-3 text-xs">
            <Car size={13} /> Ik rijd
          </button>
        )}
      </div>

      {drivers.length === 0 ? (
        canAct && (
          <p className="flex items-center gap-1.5 rounded-xl border-1.5 border-dashed border-rose-400 bg-rose-50 px-3.5 py-3 text-[12.5px] font-semibold text-rose-700 dark:border-rose-400/60 dark:bg-rose-500/10 dark:text-rose-300">
            <AlertCircle size={13} className="shrink-0" />
            Nog geen auto's — wie rijdt er?
          </p>
        )
      ) : (
        drivers.map((d) => (
          <CarCard
            key={d.name}
            driver={d}
            canAct={canAct}
            userNames={userNames}
            onJoin={cars.join}
            onUnassign={cars.unassign}
            isPending={cars.isPending}
          />
        ))
      )}

      {drivers.length > 0 && unassigned.length > 0 && canAct && (
        <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-rose-700 dark:text-rose-300">
          <AlertCircle size={13} className="shrink-0" />
          {unassigned.length} {unassigned.length === 1 ? "persoon heeft" : "personen hebben"} nog geen auto
        </p>
      )}

      {linkedMeal && linkedEvent && (
        <RestaurantQuickDriverModal
          open={driverOpen}
          onClose={() => setDriverOpen(false)}
          event={linkedEvent}
          meal={linkedMeal}
          existingRide={ride}
        />
      )}
    </motion.div>
  );
}

/**
 * A meal that needs transport but has no restaurant ride yet. "Ik rijd" creates
 * the shared ride and registers you as its first car (see RestaurantQuickDriverModal).
 */
export function RestaurantMealPrompt({ meal }: { meal: Meal }) {
  const [open, setOpen] = useState(false);
  const { data: events = [] } = useCalendar();
  const event = meal.linked_event_id ? events.find((e) => e.id === meal.linked_event_id) : undefined;
  if (!event) return null;

  return (
    <motion.div variants={listItem}>
      <div className="flex items-center gap-2.5 rounded-xl border-1.5 border-dashed border-rose-400 bg-rose-50 p-3 dark:border-rose-400/60 dark:bg-rose-500/10">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
          <Utensils size={15} />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[13px] font-semibold text-ink">{meal.meal_name}</span>
          <span className="block text-[12px] text-rose-700 dark:text-rose-300">
            <span className="font-mono tabular-nums">{formatTime(meal.time)}</span> · nog geen auto's
          </span>
        </span>
        <button type="button" onClick={() => setOpen(true)} className="btn-primary h-8 shrink-0 px-3 text-xs">
          <Car size={13} /> Ik rijd
        </button>
      </div>
      <RestaurantQuickDriverModal open={open} onClose={() => setOpen(false)} event={event} meal={meal} />
    </motion.div>
  );
}
