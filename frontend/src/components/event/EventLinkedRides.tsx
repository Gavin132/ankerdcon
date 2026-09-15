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
    <div className="card-surface overflow-hidden">
      <h2 className="section-label px-5 pb-2.5 pt-4">
        Gerelateerde ritten ({rides.length})
      </h2>
      <div className="divide-y divide-line border-t border-line">
        {rides.map((ride) => {
          const isPT = ride.is_public_transport;
          return (
            <Link
              key={ride.id}
              to={routes.ride.view(ride.id)}
              className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-sunken"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink group-hover:bg-surface">
                {isPT ? <Train size={14} /> : <Car size={14} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {ride.driver}
                  <span className="ml-1.5 text-xs font-semibold text-ink-3">
                    · {DIRECTION_LABEL[ride.direction] ?? ride.direction}
                  </span>
                </p>
                <span className="mt-0.5 flex items-center gap-1 font-mono text-[11.5px] tabular-nums text-ink-2">
                  <Clock size={10} />
                  {formatDateTime(ride.departure_time)}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {!isPT && (
                  <span className={`flex items-center gap-1 text-xs font-semibold ${
                    ride.is_full ? "text-rose-600 dark:text-rose-400" : "text-ink-3"
                  }`}>
                    <Users size={10} />
                    {ride.is_full ? "Vol" : `${ride.seats_left} vrij`}
                  </span>
                )}
                <ChevronRight size={14} className="text-ink-3 transition-colors group-hover:text-ink" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
