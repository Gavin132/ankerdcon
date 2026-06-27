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
    <div className="card-surface rounded-2xl overflow-hidden">
      <div className="h-[3px] bg-gradient-to-r from-sky-400 to-indigo-500" />
      <div className="px-5 py-4">
      <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
        Gekoppeld evenement
      </h2>
      <Link
        to={routes.event.view(event.id)}
        className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700
                   bg-slate-50 dark:bg-slate-800 px-4 py-3
                   hover:border-sky-300 dark:hover:border-sky-500/40
                   hover:bg-sky-50 dark:hover:bg-sky-500/10 transition-colors"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-500/10">
          <CalendarDays size={16} className="text-sky-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
            {event.event_name}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(event.date)}</p>
        </div>
        <ExternalLink size={14} className="shrink-0 text-slate-400" />
      </Link>
      </div>
    </div>
  );
}
