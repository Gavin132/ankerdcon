import { Clock, ExternalLink, Globe, Ticket } from "lucide-react";
import { formatCurrency, formatTicketSaleStart } from "../../utils/format";
import type { CalendarEvent } from "../../types";

interface EventLinksProps {
  event: CalendarEvent;
}

export function EventLinks({ event }: EventLinksProps) {
  const hasTickets  = (event.ticket_types?.length ?? 0) > 0;
  const hasCTAs     = !!(event.ticket_url || event.website);
  const hasSaleInfo = !!event.ticket_sale_start;

  return (
    <div className="h-full flex flex-col card-surface rounded-2xl overflow-hidden">

      {/* Panel header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 via-violet-500 to-violet-600 px-5 py-4">
        <div className="pointer-events-none absolute -top-4 -right-4 h-20 w-20 rounded-full bg-white/10 blur-xl" />
        <p className="relative text-[10px] font-bold uppercase tracking-widest text-indigo-200/70 mb-0.5">
          Tickets & Links
        </p>
        <p className="relative text-lg font-black text-white leading-tight">
          {event.event_name}
        </p>
      </div>

      {/* Ticket prices */}
      {hasTickets && (
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
            Ticketprijzen
          </p>
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
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
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

      {/* Spacer — pushes CTAs to the bottom when card is taller than content */}
      <div className="flex-1" />

      {/* CTA buttons */}
      {hasCTAs && (
        <div className="px-4 py-4 space-y-2.5">
          {event.ticket_url && (
            <a
              href={event.ticket_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-xl
                         bg-gradient-to-r from-emerald-500 to-emerald-600
                         px-4 py-3 text-sm font-bold text-white
                         hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
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
              className="flex items-center justify-center gap-2 w-full rounded-xl
                         bg-slate-100 dark:bg-slate-800
                         px-4 py-3 text-sm font-semibold
                         text-slate-700 dark:text-slate-300
                         hover:bg-slate-200 dark:hover:bg-slate-700
                         active:scale-[0.98] transition-all"
            >
              <Globe size={15} />
              Officiële website
              <ExternalLink size={12} className="opacity-50 ml-0.5" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
