import { Clock, ExternalLink, Globe, Ticket } from "lucide-react";
import { formatCurrency, formatTicketSaleStart } from "../../utils/format";
import type { CalendarEvent } from "../../types";

export function EventLinks({ event }: { event: CalendarEvent }) {
  const hasTickets  = (event.ticket_types?.length ?? 0) > 0;
  const hasCTAs     = !!(event.ticket_url || event.website);
  const hasSaleInfo = !!event.ticket_sale_start;

  return (
    <div className="card-surface rounded-2xl overflow-hidden">
      <div className="h-[3px] bg-gradient-to-r from-indigo-400 via-violet-500 to-purple-500" />

      <div className="px-5 pt-4 pb-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Tickets & Links
        </p>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
        {/* Ticket prices */}
        {hasTickets && (
          <div className="px-5 py-4">
            <div className="space-y-2.5">
              {event.ticket_types!.map((t, i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t.title}</span>
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
                    {formatCurrency(t.price)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sale start */}
        {hasSaleInfo && (
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/10 shrink-0">
              <Clock size={14} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">
                Verkoop start
              </p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {formatTicketSaleStart(event.ticket_sale_start!)}
              </p>
            </div>
          </div>
        )}

        {/* CTA buttons */}
        {hasCTAs && (
          <div className="px-5 py-4 flex flex-col sm:flex-row gap-2.5">
            {event.ticket_url && (
              <a
                href={event.ticket_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 text-sm font-bold text-white hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
              >
                <Ticket size={15} />
                Tickets kopen
                <ExternalLink size={12} className="opacity-70 ml-0.5" />
              </a>
            )}
            {event.website && (
              <a
                href={event.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.98] transition-all"
              >
                <Globe size={15} />
                Officiële website
                <ExternalLink size={12} className="opacity-50 ml-0.5" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
