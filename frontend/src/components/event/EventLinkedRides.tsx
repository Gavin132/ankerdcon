import { Link } from "react-router-dom";
import { Car, Train, Clock, ChevronRight, Users } from "lucide-react";
import { formatDateTime } from "../../utils/format";
import { routes } from "../../config/routes";
import type { Ride } from "../../types";

interface EventLinkedRidesProps {
  rides: Ride[];
}

const DIRECTION_LABEL: Record<string, string> = {
  Inbound: "Heen",
  Outbound: "Terug",
  Restaurant: "Restaurant",
};

export function EventLinkedRides({ rides }: EventLinkedRidesProps) {
  if (rides.length === 0) return null;

  return (
    <div className="card-surface rounded-2xl overflow-hidden">
      <div className="h-[3px] bg-gradient-to-r from-sky-400 to-blue-500" />
      <div className="px-5 py-4">
      <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
        Gerelateerde ritten ({rides.length})
      </h2>
      <div className="space-y-2">
        {rides.map((ride) => {
          const isPT = ride.is_public_transport;
          return (
            <Link
              key={ride.id}
              to={routes.ride.view(ride.id)}
              className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700
                         bg-slate-50 dark:bg-slate-800 px-4 py-3
                         hover:border-sky-300 dark:hover:border-sky-500/40
                         hover:bg-sky-50 dark:hover:bg-sky-500/10 transition-colors"
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                isPT ? "bg-violet-100 dark:bg-violet-500/10" : "bg-sky-100 dark:bg-sky-500/10"
              }`}>
                {isPT
                  ? <Train size={15} className="text-violet-500" />
                  : <Car size={15} className="text-sky-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {ride.driver}
                  <span className="ml-1.5 text-xs font-semibold text-slate-400">
                    · {DIRECTION_LABEL[ride.direction] ?? ride.direction}
                  </span>
                </p>
                <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <Clock size={10} />
                  {formatDateTime(ride.departure_time)}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!isPT && (
                  <span className={`flex items-center gap-1 text-xs font-semibold ${
                    ride.is_full ? "text-rose-500" : "text-slate-400"
                  }`}>
                    <Users size={10} />
                    {ride.is_full ? "Vol" : `${ride.seats_left} vrij`}
                  </span>
                )}
                <ChevronRight size={14} className="text-slate-400" />
              </div>
            </Link>
          );
        })}
      </div>
      </div>
    </div>
  );
}
