import { Link } from "react-router-dom";
import { CalendarDays, ChevronRight } from "lucide-react";
import { formatDate } from "../../utils/format";
import { routes } from "../../config/routes";
import type { CalendarEvent } from "../../types";

interface LinkedEventCardProps {
  event: CalendarEvent;
}

/** The event a meal or ride belongs to: the whole card is the link. */
export function LinkedEventCard({ event }: LinkedEventCardProps) {
  return (
    <Link to={routes.event.view(event.id)} className="card-surface card-surface-hover block px-4 py-4">
      <h2 className="section-label mb-3">Gekoppeld evenement</h2>
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
          <CalendarDays size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{event.event_name}</p>
          <p className="truncate text-xs text-ink-2">{formatDate(event.date)}</p>
        </div>
        <ChevronRight size={16} className="shrink-0 text-ink-3" />
      </div>
    </Link>
  );
}
