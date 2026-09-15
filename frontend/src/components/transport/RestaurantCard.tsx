import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car,
  Truck,
  Users,
  ChevronDown,
  ChevronRight,
  Timer,
  AlertCircle,
  CheckCircle2,
  Utensils,
} from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { useMeals } from "../../hooks/useMeals";
import { useUsers } from "../../hooks/useUsers";
import { formatTime } from "../../utils/format";
import { getRideStatus, formatCountdown } from "../../utils/rides";
import { listItem } from "../../utils/motion";
import { routes } from "../../config/routes";
import type { Ride } from "../../types";

interface RestaurantCardProps {
  ride: Ride;
  userNames: string[];
}

export function RestaurantCard({ ride }: RestaurantCardProps) {
  const navigate = useNavigate();
  const [attendeesOpen, setAttendeesOpen] = useState(false);

  const { data: users = [] } = useUsers();
  const { data: meals = [] } = useMeals();

  const { status, minutesUntil } = getRideStatus(ride.departure_time);
  const isPast = status === "past";
  const isRecent = status === "recent";

  const drivers = ride.restaurant_drivers ?? [];
  const linkedMeal = ride.linked_meal_id ? meals.find((m) => m.id === ride.linked_meal_id) : undefined;
  const attendees = linkedMeal ? (linkedMeal.participants ?? []) : ride.passengers;
  const driverNames = new Set(drivers.map((d) => d.name));
  const assignedPax = new Set(drivers.flatMap((d) => d.passengers));
  const unassigned = attendees.filter((a) => !driverNames.has(a) && !assignedPax.has(a));
  const totalCapacity = drivers.reduce((sum, d) => sum + d.seats, 0);
  const totalAssigned = assignedPax.size;
  const hasGap = unassigned.length > 0 && drivers.length > 0;
  const nonDriverAttendees = attendees.filter((a) => !driverNames.has(a));
  const allClear = drivers.length > 0 && nonDriverAttendees.length > 0 && unassigned.length === 0;
  const allParticipants = Array.from(new Set([...attendees, ...drivers.map((d) => d.name)]));

  function resolveName(stored: string) {
    return users.find((u) => u.name === stored || u.discord_username === stored || u.aliases?.includes(stored))?.name ?? stored;
  }

  const statusBadge = status === "urgent" || status === "soon" || status === "recent";
  const statusBadgeClass =
    status === "urgent"
      ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
      : status === "soon"
        ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
        : "bg-sunken text-ink-2";

  // No driver yet on an upcoming restaurant ride: the card itself shows the gap (dashed rose).
  const needsDriver = drivers.length === 0 && !isPast && !isRecent;

  return (
    <motion.div
      variants={listItem}
      className={isPast || isRecent ? "opacity-60" : ""}
    >
      <div
        onClick={() => navigate(routes.ride.view(ride.id))}
        className={`flex cursor-pointer flex-col gap-2.5 rounded-[12px] border-1.5 p-3.5 transition-colors ${
          needsDriver
            ? "border-dashed border-rose-400 bg-rose-50 hover:border-rose-500 dark:border-rose-400/60 dark:bg-rose-500/10"
            : "border-line bg-surface hover:border-ink-3"
        }`}
      >
        {/* ── Top row: restaurant + organizer + time ── */}
        <div className="flex items-center gap-2.5">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${needsDriver ? "bg-surface text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" : "bg-sunken text-ink"}`}>
            <Utensils size={15} />
          </span>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[14px] font-semibold text-ink">Restaurant</span>
            <span className="flex min-w-0 items-center gap-1 text-[11.5px] text-ink-3">
              <span className="shrink-0">Organisator</span>
              <span aria-hidden>·</span>
              <UserAvatar name={ride.driver} className="h-4 w-4 text-[7px] !border-0" />
              <span className="truncate text-ink-2">{resolveName(ride.driver)}</span>
            </span>
          </div>
          <div className="ml-auto shrink-0 text-right leading-tight">
            <p className="font-mono text-[15px] font-semibold tabular-nums text-ink">{formatTime(ride.departure_time)}</p>
          </div>
        </div>

        {statusBadge && (
          <span className={`inline-flex items-center gap-1 self-start rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${statusBadgeClass}`}>
            <Timer size={11} />
            {status === "recent" ? "Vertrokken" : `Over ${formatCountdown(minutesUntil)}`}
          </span>
        )}

        {/* ── Status lines ── */}
        {hasGap && !isPast && !isRecent && (
          <div className="flex items-center justify-between gap-2 text-[12.5px]">
            <span className="flex min-w-0 items-center gap-1.5 font-semibold text-rose-700 dark:text-rose-300">
              <AlertCircle size={13} className="shrink-0" />
              {unassigned.length} {unassigned.length === 1 ? "persoon heeft" : "personen hebben"} nog geen rit
            </span>
            <Link to={routes.ride.view(ride.id)} onClick={(e) => e.stopPropagation()} className="shrink-0 whitespace-nowrap text-[12.5px] font-semibold text-rose-700 hover:underline dark:text-rose-300">
              Wijs toe →
            </Link>
          </div>
        )}
        {!hasGap && ride.action_required && !isPast && !isRecent && !allClear && (
          <div className="flex items-center justify-between gap-2 text-[12.5px]">
            <span className={`flex min-w-0 items-center gap-1.5 font-semibold ${drivers.length === 0 ? "text-rose-700 dark:text-rose-300" : "text-amber-800 dark:text-amber-300"}`}>
              <AlertCircle size={13} className="shrink-0" />
              <span className="truncate">{drivers.length === 0 ? "Nog geen auto's — wie rijdt er?" : "Actie vereist — laat weten of je meekomt"}</span>
            </span>
            {drivers.length === 0 ? (
              <Link
                to={routes.ride.view(ride.id)}
                onClick={(e) => e.stopPropagation()}
                className="btn-primary shrink-0 whitespace-nowrap px-3 py-1.5 text-xs"
              >
                Ik rijd →
              </Link>
            ) : (
              <Link to={routes.ride.view(ride.id)} onClick={(e) => e.stopPropagation()} className="shrink-0 whitespace-nowrap text-[12.5px] font-semibold text-amber-800 hover:underline dark:text-amber-300">
                Bekijk →
              </Link>
            )}
          </div>
        )}
        {allClear && !isPast && !isRecent && (
          <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 size={13} className="shrink-0" />
            Iedereen heeft een rit — alles geregeld!
          </div>
        )}

        {/* ── Cars summary ── */}
        {drivers.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {drivers.map((d) => {
              const isTimo = d.name.trim().toLowerCase().startsWith("timo");
              const CarIcon = isTimo ? Truck : Car;
              const isFull = d.passengers.length >= d.seats;
              return (
                <div key={d.name} className="flex items-center gap-1.5 rounded-md border-1.5 border-line bg-surface px-2 py-1">
                  <CarIcon size={12} className="shrink-0 text-ink-3" />
                  <span className="text-[12px] font-semibold text-ink">{d.name}</span>
                  <span className={`font-mono text-[11px] font-semibold tabular-nums ${isFull ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"}`}>
                    {d.passengers.length}/{d.seats}
                  </span>
                </div>
              );
            })}
            {drivers.length > 0 && (
              <div className="flex items-center gap-1 rounded-md bg-sunken px-2 py-1">
                <Users size={11} className="text-ink-3" />
                <span className="font-mono text-[11px] font-semibold tabular-nums text-ink-2">{totalAssigned}/{totalCapacity}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Footer: attendees + link ── */}
        <div className={`flex items-center justify-between gap-3 border-t border-dashed pt-2.5 ${needsDriver ? "border-rose-300 dark:border-rose-400/40" : "border-line"}`}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); if (allParticipants.length > 0) setAttendeesOpen((v) => !v); }}
            className={`flex min-w-0 items-center gap-1 text-[12px] text-ink-2 ${allParticipants.length > 0 ? "hover:text-ink" : "cursor-default"}`}
            aria-expanded={allParticipants.length > 0 ? attendeesOpen : undefined}
          >
            {allParticipants.length > 0 ? (
              <>
                <Users size={12} className="shrink-0 text-ink-3" />
                <span>
                  <span className="font-mono font-semibold tabular-nums text-ink">{allParticipants.length}</span> deelnemer{allParticipants.length !== 1 ? "s" : ""}
                </span>
                <ChevronDown size={12} className={`shrink-0 text-ink-3 transition-transform ${attendeesOpen ? "rotate-180" : ""}`} />
              </>
            ) : (
              <span className="flex items-center gap-1 text-ink-3">
                <Users size={12} />
                Geen deelnemers
              </span>
            )}
          </button>

          <div className="flex min-w-0 items-center gap-1.5">
            {linkedMeal && (
              <Link
                to={routes.meal.view(linkedMeal.id)}
                onClick={(e) => e.stopPropagation()}
                className="flex min-w-0 max-w-[150px] items-center gap-1 rounded-md border border-line bg-surface px-1.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.05em] text-ink-2 transition-colors hover:border-ink-3 hover:text-ink"
              >
                <Utensils size={10} className="shrink-0" />
                <span className="truncate">{linkedMeal.meal_name}</span>
              </Link>
            )}
            <ChevronRight size={14} className="shrink-0 text-ink-3" />
          </div>
        </div>

        {/* Expanded attendees */}
        <AnimatePresence>
          {attendeesOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="-mt-1 overflow-hidden"
            >
              <div className="flex flex-wrap gap-1.5 pt-1">
                {allParticipants.map((p) => (
                  <div key={p} className="inline-flex items-center gap-1.5 rounded-full border-1.5 border-line bg-surface px-2 py-1 text-[12px] font-medium text-ink-2">
                    <UserAvatar name={p} className="h-4 w-4 text-[8px] !border-0" />
                    {resolveName(p)}
                    {driverNames.has(p) && <Car size={10} className="shrink-0 text-ink-3" />}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
