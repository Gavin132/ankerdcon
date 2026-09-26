import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Utensils, Users, Clock } from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { getRideStatus } from "../../utils/rides";
import { listContainer, listItem } from "../../utils/motion";
import { EmptyState } from "../common/EmptyState";
import type { Ride } from "../../types";

interface RideTimelineProps {
  rides: Ride[];
}

const DIRECTION = {
  Inbound:    { Icon: ArrowRight, label: "Heen",       dot: "border-2 border-ink bg-surface" },
  Outbound:   { Icon: ArrowLeft,  label: "Terug",      dot: "border-2 border-ink bg-ink" },
  Restaurant: { Icon: Utensils,   label: "Restaurant", dot: "border-2 border-ink bg-surface" },
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
        const { Icon, label, dot } = DIRECTION[ride.direction];
        const { time, date } = parseTime(ride.departure_time);
        const takenSeats = ride.total_seats - ride.seats_left;
        const isPT = ride.is_public_transport;
        const isLast = index === sorted.length - 1;

        return (
          <motion.div key={ride.id} variants={listItem} className="flex gap-3">
            {/* Time column */}
            <div className="w-14 shrink-0 text-right pt-2">
              <p className="font-mono text-sm font-semibold leading-tight tabular-nums text-ink">
                {time}
              </p>
              <p className="mt-0.5 font-mono text-[10px] uppercase leading-tight tracking-[0.04em] text-ink-3">
                {date}
              </p>
            </div>

            {/* Connector */}
            <div className="flex flex-col items-center pt-2.5">
              <div className={`h-3 w-3 shrink-0 rounded-full ${dot}`} />
              {!isLast && (
                <div className="my-1.5 w-0.5 flex-1 bg-line" />
              )}
            </div>

            {/* Card */}
            <div className="flex-1 min-w-0 pb-3">
              <div className="card-surface space-y-2 px-3 py-2.5">
                {/* Top row: direction badge + route */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-md border border-line px-1.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.05em] text-ink-2">
                    <Icon size={10} />
                    {label}
                  </span>
                  <p className="min-w-0 truncate text-sm font-semibold text-ink">
                    {ride.start_location}
                  </p>
                </div>

                {/* Driver + seats */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <UserAvatar name={ride.driver} className="h-6 w-6 text-[10px]" />
                    <span className="truncate text-xs font-medium text-ink-2">
                      {ride.driver}
                    </span>
                  </div>

                  {!isPT && ride.total_seats < 99 && (
                    <div className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums ${
                      ride.is_full
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                        : "bg-sunken text-ink-2"
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
                  <div className="h-1 overflow-hidden rounded-full bg-sunken">
                    <motion.div
                      className={`h-full rounded-full ${ride.is_full ? "bg-rose-500" : "bg-ink"}`}
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
