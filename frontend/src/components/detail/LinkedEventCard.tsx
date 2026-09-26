import { Link } from "react-router-dom";
import { CalendarDays, ExternalLink } from "lucide-react";
import { formatDate } from "../../utils/format";
import { routes } from "../../config/routes";
import type { CalendarEvent } from "../../types";

interface LinkedEventCardProps {
  event: CalendarEvent;
}

export function LinkedEventCard({ event }: LinkedEventCardProps) {
  return (
    <div className="card-surface overflow-hidden">
      <div className="px-4 py-4">
        <h2 className="section-label mb-3">
          Gekoppeld evenement
        </h2>
        <Link
          to={routes.event.view(event.id)}
          className="flex items-center gap-3 rounded-xl border-1.5 border-line bg-surface px-3.5 py-3 transition-colors hover:border-ink-3"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
            <CalendarDays size={15} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">
              {event.event_name}
            </p>
            <p className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-3">{formatDate(event.date)}</p>
          </div>
          <ExternalLink size={14} className="shrink-0 text-ink-3" />
        </Link>
      </div>
    </div>
  );
}
