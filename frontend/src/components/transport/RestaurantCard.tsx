import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car,
  Truck,
  Users,
  ChevronDown,
  Timer,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Link2,
  Utensils,
} from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { useCalendar } from "../../hooks/useCalendar";
import { useMeals } from "../../hooks/useMeals";
import { useUsers } from "../../hooks/useUsers";
import { formatDate, formatTime } from "../../utils/format";
import { getRideStatus, formatCountdown } from "../../utils/rides";
import { listItem } from "../../utils/motion";
import { routes } from "../../config/routes";
import type { Ride } from "../../types";

interface RestaurantCardProps {
  ride: Ride;
  userNames: string[];
}

export function RestaurantCard({ ride }: RestaurantCardProps) {
  const [attendeesOpen, setAttendeesOpen] = useState(false);

  const { data: users = [] } = useUsers();
  const { data: events = [] } = useCalendar();
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
  const linkedEvent = ride.linked_event_id ? events.find((e) => e.id === ride.linked_event_id) : undefined;

  function resolveName(stored: string) {
    return users.find((u) => u.name === stored || u.discord_username === stored || u.aliases?.includes(stored))?.name ?? stored;
  }

  const statusBadge = status === "urgent" || status === "soon" || status === "recent";
  const statusBadgeClass =
    status === "urgent"
      ? "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"
      : status === "soon"
        ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
        : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300";

  return (
    <motion.div variants={listItem} className={isPast || isRecent ? "opacity-60" : ""}>
      <div className="card-surface rounded-2xl overflow-hidden">

        {/* Amber accent line */}
        <div className="h-[3px] bg-gradient-to-r from-amber-400 to-orange-400" />

        {/* Banners */}
        {hasGap && !isPast && !isRecent && (
          <div className="flex items-center justify-between gap-2 border-b border-rose-200 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-900/25 px-4 py-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-300">
              <AlertCircle size={12} className="shrink-0" />
              {unassigned.length} {unassigned.length === 1 ? "persoon heeft" : "personen hebben"} nog geen rit
            </span>
            <Link to={routes.ride.view(ride.id)} className="shrink-0 text-xs font-bold text-rose-700 dark:text-rose-300 hover:underline">
              Wijs toe →
            </Link>
          </div>
        )}
        {!hasGap && ride.action_required && !isPast && !isRecent && !allClear && (
          <div className="flex items-center justify-between gap-2 border-b border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/25 px-4 py-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
              <AlertCircle size={12} className="shrink-0" />
              {drivers.length === 0 ? "Nog geen auto's — wie rijdt er?" : "Actie vereist — laat weten of je meekomt"}
            </span>
            <Link to={routes.ride.view(ride.id)} className="shrink-0 text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline">
              {drivers.length === 0 ? "Ik rijd →" : "Bekijk →"}
            </Link>
          </div>
        )}
        {allClear && !isPast && !isRecent && (
          <div className="flex items-center gap-2 border-b border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-900/25 px-4 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 size={12} className="shrink-0" />
            Iedereen heeft een rit — alles geregeld!
          </div>
        )}

        {/* ── Top row ── */}
        <div className="px-4 pt-3.5 pb-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/10">
                <Utensils size={13} className="text-amber-500" strokeWidth={2.5} />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Restaurant</span>
              {statusBadge && (
                <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass} ${status === "urgent" ? "animate-pulse" : ""}`}>
                  <Timer size={9} />
                  {status === "recent" ? "Vertrokken" : `Over ${formatCountdown(minutesUntil)}`}
                </span>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{formatDate(ride.departure_time)}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{formatTime(ride.departure_time)}</p>
            </div>
          </div>
        </div>

        {/* ── Location + organizer ── */}
        <div className="px-4 pt-3.5 pb-3 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Locatie</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{ride.start_location}</p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <UserAvatar name={ride.driver} className="h-7 w-7 text-[11px]" />
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Organisator</p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-[80px]">{resolveName(ride.driver)}</p>
            </div>
          </div>
        </div>

        {/* ── Cars summary ── */}
        {drivers.length > 0 && (
          <div className="px-4 pb-3">
            <div className="flex flex-wrap gap-2">
              {drivers.map((d) => {
                const isTimo = d.name.trim().toLowerCase().startsWith("timo");
                const CarIcon = isTimo ? Truck : Car;
                const isFull = d.passengers.length >= d.seats;
                return (
                  <div key={d.name} className="flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1">
                    <CarIcon size={11} className="text-amber-500 shrink-0" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{d.name}</span>
                    <span className={`text-[10px] font-bold ${isFull ? "text-rose-500" : "text-emerald-500"}`}>
                      {d.passengers.length}/{d.seats}
                    </span>
                  </div>
                );
              })}
              {drivers.length > 0 && (
                <div className="flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1">
                  <Users size={10} className="text-slate-400" />
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{totalAssigned}/{totalCapacity}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Attendees toggle row ── */}
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => allParticipants.length > 0 && setAttendeesOpen((v) => !v)}
            className={`flex items-center gap-2 min-w-0 ${allParticipants.length > 0 ? "hover:opacity-75 transition-opacity" : "cursor-default"}`}
          >
            {allParticipants.length > 0 ? (
              <>
                <div className="flex -space-x-2">
                  {allParticipants.slice(0, 4).map((p) => (
                    <UserAvatar key={p} name={p} className="h-6 w-6 text-[9px] ring-2 ring-white dark:ring-slate-900" />
                  ))}
                  {allParticipants.length > 4 && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-white dark:ring-slate-900 bg-slate-200 dark:bg-slate-600 text-[9px] font-bold text-slate-600 dark:text-slate-200">
                      +{allParticipants.length - 4}
                    </div>
                  )}
                </div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <span className="font-bold text-slate-700 dark:text-slate-200">{allParticipants.length}</span> deelnemer{allParticipants.length !== 1 ? "s" : ""}
                </span>
                <motion.div animate={{ rotate: attendeesOpen ? 180 : 0 }} transition={{ duration: 0.18 }}>
                  <ChevronDown size={11} className="text-slate-400" />
                </motion.div>
              </>
            ) : (
              <span className="flex items-center gap-1.5 text-[11px] text-slate-400 italic">
                <Users size={11} />
                Geen deelnemers
              </span>
            )}
          </button>

          {linkedMeal && (
            <Link
              to={routes.meal.view(linkedMeal.id)}
              className="shrink-0 flex items-center gap-1.5 rounded-lg border border-amber-200 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors max-w-[130px]"
            >
              <Utensils size={10} className="shrink-0" />
              <span className="truncate">{linkedMeal.meal_name}</span>
            </Link>
          )}
          {!linkedMeal && linkedEvent && (
            <Link
              to={routes.event.view(linkedEvent.id)}
              className="shrink-0 flex items-center gap-1.5 rounded-lg border border-sky-200 dark:border-sky-700/60 bg-sky-50 dark:bg-sky-900/30 px-2 py-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors max-w-[130px]"
            >
              <Link2 size={10} className="shrink-0" />
              <span className="truncate">{linkedEvent.event_name}</span>
            </Link>
          )}
        </div>

        {/* Expanded attendees */}
        <AnimatePresence>
          {attendeesOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                {allParticipants.map((p) => (
                  <div key={p} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-600 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    <UserAvatar name={p} className="h-4 w-4 text-[8px] !border-0" />
                    {resolveName(p)}
                    {driverNames.has(p) && <Car size={9} className="text-amber-500 shrink-0" />}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Footer ── */}
        <div className="flex items-center border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-black/20 px-3 py-2">
          <Link
            to={routes.ride.view(ride.id)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            Details <ArrowRight size={11} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
