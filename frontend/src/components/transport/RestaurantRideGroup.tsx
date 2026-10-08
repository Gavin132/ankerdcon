import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, CalendarClock, Car, ChevronDown, ChevronRight, Plus, UserMinus, Users } from "lucide-react";
import { Button } from "../common/Button";
import { Collapse } from "../common/Collapse";
import { NamePicker } from "../common/NamePicker";
import { RestaurantQuickDriverModal } from "./RestaurantQuickDriverModal";
import { useMeals } from "../../hooks/useMeals";
import { useCalendar } from "../../hooks/useCalendar";
import { useCurrentUser, useUsers } from "../../hooks/useUsers";
import { useRestaurantCars } from "../../hooks/useRestaurantCars";
import { formatTime } from "../../utils/format";
import { getRideStatus } from "../../utils/rides";
import { listItem } from "../../utils/motion";
import { routes } from "../../config/routes";
import type { Meal, Ride, RestaurantDriver } from "../../types";

/** The member's own car. Same blue as their row under Heen and Terug (RideRow). */
const MINE_CLASS = "bg-[#0D75D1] text-white dark:bg-[#1A6FC9]";

/** "Timo, Els en Noor" */
function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} en ${names[names.length - 1]}`;
}

interface CarRowProps {
  driver: RestaurantDriver;
  departure: string;
  canAct: boolean;
  /** Everyone who could step into this car. */
  userNames: string[];
  mine: boolean;
  expanded: boolean;
  onToggle: () => void;
  cars: ReturnType<typeof useRestaurantCars>;
}

/**
 * One car on an activity's ride, laid out like a ride under Heen and Terug (RideRow):
 * time, driver and who is along on one line, seats free on the right, and getting in
 * or out one tap away.
 */
function CarRow({ driver, departure, canAct, userNames, mine, expanded, onToggle, cars }: CarRowProps) {
  const [action, setAction] = useState<"join" | "leave" | null>(null);
  const [joinNames, setJoinNames] = useState<string[]>([]);
  const [leaveNames, setLeaveNames] = useState<string[]>([]);

  const spotsLeft = Math.max(0, driver.seats - driver.passengers.length);
  const isFull = spotsLeft === 0;
  const available = userNames.filter((n) => n !== driver.name && !driver.passengers.includes(n));

  function open(next: "join" | "leave") {
    setAction(next);
    setJoinNames([]);
    setLeaveNames([]);
  }

  async function submit() {
    const ok = action === "join" ? await cars.join(driver.name, joinNames) : await cars.unassign(leaveNames);
    if (ok) setAction(null);
  }

  const names = action === "join" ? joinNames : leaveNames;
  const sub = driver.passengers.length > 0 ? listNames(driver.passengers) : "Nog geen meerijders";

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (expanded) setAction(null);
          onToggle();
        }}
        aria-expanded={expanded}
        className={`flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors ${mine ? MINE_CLASS : "hover:bg-sunken"}`}
      >
        <span
          className={`w-[62px] shrink-0 font-display text-[28px] font-extrabold leading-[0.95] tabular-nums ${
            mine ? "" : isFull ? "text-ink-3" : "text-ink-2"
          }`}
        >
          {formatTime(departure)}
        </span>
        <span className="min-w-0 flex-1 leading-[1.3]">
          <span className={`block truncate text-[14px] font-semibold ${mine ? "" : "text-ink-2"}`}>{driver.name}</span>
          <span className={`block truncate text-[12px] ${mine ? "text-white/85" : "text-ink-3"}`}>{sub}</span>
        </span>
        <span className="shrink-0 text-right leading-[1.3]">
          <span className={`block text-[12px] ${isFull ? "font-semibold" : ""} ${mine ? "text-white/90" : "text-ink-2"}`}>
            {isFull ? "Vol" : `${spotsLeft} vrij`}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""} ${mine ? "text-white/85" : "text-ink-3"}`}
        />
      </button>

      <Collapse open={expanded}>
        <div className="space-y-2.5 pb-4 pl-[92px] pr-4 pt-3 text-[12.5px] text-ink-2">
          <div className="flex items-start gap-2">
            <Users size={13} className="mt-0.5 shrink-0 text-ink-3" />
            <span>
              {driver.passengers.length > 0
                ? `${listNames(driver.passengers)} ${driver.passengers.length === 1 ? "rijdt" : "rijden"} mee`
                : "Nog geen meerijders"}
            </span>
          </div>

          {canAct && (
            <div className="space-y-2.5 pt-1">
              {action ? (
                <>
                  {action === "join" ? (
                    <NamePicker multiple options={available} value={joinNames} onChange={setJoinNames} maxSelect={spotsLeft} color="sky" />
                  ) : (
                    <NamePicker multiple options={driver.passengers} value={leaveNames} onChange={setLeaveNames} color="rose" />
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setAction(null)}>
                      Annuleer
                    </Button>
                    <Button
                      size="sm"
                      variant={action === "leave" ? "danger" : "primary"}
                      className="min-w-0 flex-1"
                      loading={cars.isPending}
                      disabled={names.length === 0}
                      onClick={submit}
                    >
                      {action === "join" ? <Plus size={15} /> : <UserMinus size={15} />}
                      {names.length === 0
                        ? "Selecteer een naam"
                        : action === "join"
                          ? names.length === 1 ? `${names[0]} stapt in` : `${names.length} personen stappen in`
                          : names.length === 1 ? `${names[0]} uitstappen` : `${names.length} personen uitstappen`}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {!isFull && (
                    <Button size="sm" className="flex-1" onClick={() => open("join")}>
                      <Plus size={14} />
                      Stap in
                    </Button>
                  )}
                  {driver.passengers.length > 0 && (
                    <Button size="sm" variant="secondary" onClick={() => open("leave")}>
                      <UserMinus size={14} />
                      Uitstappen
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Collapse>
    </div>
  );
}

/**
 * A ride to an activity, in the Vervoer sheet: a small header naming the activity,
 * then every car going there as a row, the same look as Heen and Terug.
 */
export function RestaurantRideGroup({ ride, userNames }: { ride: Ride; userNames: string[] }) {
  const [driverOpen, setDriverOpen] = useState(false);
  const [expandedCar, setExpandedCar] = useState<string | null>(null);
  const { data: meals = [] } = useMeals();
  const { data: events = [] } = useCalendar();
  const { data: me } = useCurrentUser();
  const { data: users = [] } = useUsers();

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

  const resolve = (stored: string) =>
    users.find((u) => u.name === stored || u.discord_username === stored || u.aliases?.includes(stored))?.name ?? stored;
  const isMine = (d: RestaurantDriver) =>
    !!me && (resolve(d.name) === me.name || d.passengers.some((p) => resolve(p) === me.name));

  return (
    <motion.div variants={listItem} className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Link
          to={linkedMeal ? routes.meal.view(linkedMeal.id) : routes.ride.view(ride.id)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg py-0.5 text-left transition-colors hover:text-ink"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sunken text-ink">
            <CalendarClock size={12} />
          </span>
          <span className="truncate text-[13px] font-semibold text-ink">{linkedMeal?.meal_name ?? "Activiteit"}</span>
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
        <div className="card-surface divide-y divide-line overflow-hidden">
          {drivers.map((d) => (
            <CarRow
              key={d.name}
              driver={d}
              departure={ride.departure_time}
              canAct={canAct}
              userNames={userNames}
              mine={isMine(d)}
              expanded={expandedCar === d.name}
              onToggle={() => setExpandedCar((prev) => (prev === d.name ? null : d.name))}
              cars={cars}
            />
          ))}
        </div>
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
 * An activity that needs transport but has no ride yet. "Ik rijd" creates
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
          <CalendarClock size={15} />
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
