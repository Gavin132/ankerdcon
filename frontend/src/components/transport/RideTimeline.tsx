import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Utensils, Users, Clock } from "lucide-react";
import { avatarColor } from "../../utils/avatar";
import { getRideStatus } from "../../utils/rides";
import { listContainer, listItem } from "../../utils/motion";
import { EmptyState } from "../common/EmptyState";
import type { Ride } from "../../types";

interface RideTimelineProps {
  rides: Ride[];
}

const DIRECTION = {
  Inbound:    { Icon: ArrowRight, label: "Heen",       dot: "bg-sky-400",    badge: "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"       },
  Outbound:   { Icon: ArrowLeft,  label: "Terug",      dot: "bg-orange-400", badge: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  Restaurant: { Icon: Utensils,   label: "Restaurant", dot: "bg-amber-400",  badge: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"  },
} as const;

function parseTime(dt: string): { time: string; date: string } {
  const d = new Date(dt.replace(" ", "T"));
  return {
    time: d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }),
    date: d.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" }),
  };
}

export function RideTimeline({ rides }: RideTimelineProps) {
  const sorted = [...rides]
    .filter((r) => getRideStatus(r.departure_time).status !== "past")
    .sort(
      (a, b) =>
        new Date(a.departure_time.replace(" ", "T")).getTime() -
        new Date(b.departure_time.replace(" ", "T")).getTime(),
    );

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={<Clock size={36} />}
        title="Geen geplande ritten"
        description="Er zijn nog geen actieve ritten in de tijdlijn."
      />
    );
  }

  return (
    <motion.div
      className="space-y-0"
      variants={listContainer}
      initial="hidden"
      animate="show"
    >
      {sorted.map((ride, index) => {
        const { Icon, label, dot, badge } = DIRECTION[ride.direction];
        const { time, date } = parseTime(ride.departure_time);
        const takenSeats = ride.total_seats - ride.seats_left;
        const isPT = ride.is_public_transport;
        const isLast = index === sorted.length - 1;

        return (
          <motion.div key={ride.row_number} variants={listItem} className="flex gap-3">
            {/* Time column */}
            <div className="w-14 shrink-0 text-right pt-2">
              <p className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                {time}
              </p>
              <p className="text-[10px] font-medium text-slate-400 leading-tight mt-0.5">
                {date}
              </p>
            </div>

            {/* Connector */}
            <div className="flex flex-col items-center pt-2.5">
              <div className={`h-3 w-3 rounded-full shrink-0 ${dot} ring-2 ring-white dark:ring-slate-900`} />
              {!isLast && (
                <div className="flex-1 w-px bg-slate-200 dark:bg-slate-700 my-1.5" />
              )}
            </div>

            {/* Card */}
            <div className="flex-1 min-w-0 pb-3">
              <div className="card-surface rounded-xl px-3 py-2.5 space-y-2">
                {/* Top row: direction badge + route */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold ${badge}`}>
                    <Icon size={10} />
                    {label}
                  </span>
                  <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                    {ride.start_location}
                  </p>
                </div>

                {/* Driver + seats */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-black text-white ${avatarColor(ride.driver)}`}
                    >
                      {ride.driver[0].toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 truncate">
                      {ride.driver}
                    </span>
                  </div>

                  {!isPT && ride.total_seats < 99 && (
                    <div className={`shrink-0 flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold ${
                      ride.is_full
                        ? "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400"
                        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                    }`}>
                      <Users size={10} />
                      {ride.is_full
                        ? "Vol"
                        : `${takenSeats}/${ride.total_seats}`}
                    </div>
                  )}
                </div>

                {/* Seat progress bar */}
                {!isPT && ride.total_seats < 99 && (
                  <div className="h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                    <motion.div
                      className={`h-full rounded-full ${ride.is_full ? "bg-rose-400" : "bg-sky-400"}`}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: takenSeats / ride.total_seats }}
                      style={{ transformOrigin: "left" }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
