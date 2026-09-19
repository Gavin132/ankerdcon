import { Clock, ExternalLink, Globe, Ticket } from "lucide-react";
import { formatCurrency, formatTicketSaleStart } from "../../utils/format";
import { safeHref } from "../../utils/validation";
import type { CalendarEvent } from "../../types";

interface EventLinksProps {
  event: CalendarEvent;
  /** When true, renders only the row content — no card surface or
   * "Tickets & Links" label — for embedding inside a parent card. */
  bare?: boolean;
}

export function EventLinks({ event, bare = false }: EventLinksProps) {
  const hasTickets  = (event.ticket_types?.length ?? 0) > 0;
  const ticketUrl   = safeHref(event.ticket_url);
  const websiteUrl  = safeHref(event.website);
  const hasCTAs     = !!(ticketUrl || websiteUrl);
  const hasSaleInfo = !!event.ticket_sale_start;

  const linkButton =
    "flex flex-1 items-center justify-center gap-2 rounded-xl border-1.5 border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink-3";

  const content = (
      <div className="divide-y divide-line">
        {/* Ticket prices */}
        {hasTickets && (
          <div className="px-5 py-4">
            <p className="section-label mb-2.5">
              Tickets
            </p>
            <div className="space-y-2">
              {event.ticket_types!.map((t, i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-ink-2">{t.title}</span>
                  <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-ink">
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
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
              <Clock size={14} />
            </div>
            <div>
              <p className="section-label mb-0.5">
                Verkoop start
              </p>
              <p className="font-mono text-sm font-semibold tabular-nums text-ink">
                {formatTicketSaleStart(event.ticket_sale_start!)}
              </p>
            </div>
          </div>
        )}

        {/* CTA buttons */}
        {hasCTAs && (
          <div className="flex flex-col gap-2.5 px-5 py-4 sm:flex-row">
            {ticketUrl && (
              <a
                href={ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={linkButton}
              >
                <Ticket size={15} />
                Tickets kopen
                <ExternalLink size={12} className="ml-0.5 text-ink-3" />
              </a>
            )}
            {websiteUrl && (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={linkButton}
              >
                <Globe size={15} />
                Officiële website
                <ExternalLink size={12} className="ml-0.5 text-ink-3" />
              </a>
            )}
          </div>
        )}
      </div>
  );

  if (bare) return content;

  return (
    <div className="card-surface overflow-hidden">
      <div className="px-5 pb-1 pt-4">
        <p className="section-label">
          Tickets & Links
        </p>
      </div>

      {content}
    </div>
  );
}
