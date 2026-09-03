import { CalendarDays } from "lucide-react";
import { formatDate } from "../../utils/format";
import type { CalendarEvent } from "../../types";

interface Props {
  event: CalendarEvent;
}

export function NextEventBanner({ event }: Props) {
  return (
    <div className="relative overflow-hidden rounded-2xl gradient-hero px-5 py-4 shadow-hero">
      <div className="pointer-events-none absolute -top-8 -right-8 h-28 w-28 rounded-full bg-sky-400/10" />
      <div className="relative">
        <div className="mb-1 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
          <span className="text-xs font-bold text-sky-400 uppercase tracking-widest">
            Aankomend evenement
          </span>
        </div>
        <p className="font-black text-white text-base leading-tight">
          {event.event_name}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-sky-300">
          <CalendarDays size={12} className="text-sky-400" />
          {formatDate(event.date)}
          {event.is_hotel && " · Hotel inbegrepen"}
        </p>
      </div>
    </div>
  );
}
