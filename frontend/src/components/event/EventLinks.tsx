import { ExternalLink, Globe, Ticket } from "lucide-react";
import { formatAmount, formatTicketSaleStart } from "../../utils/format";
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
    "btn-primary flex-1 px-4";

  // Inside a sheet the sheet already has its own side padding; in a card the rows bring theirs.
  const pad = bare ? "py-3.5" : "px-5 py-4";

  const content = (
      <div className="divide-y divide-line">
        {/* Ticket prices */}
        {hasTickets && (
          <div className={pad}>
            <p className="section-label mb-2.5">
              Tickets
            </p>
            <div className="space-y-2">
              {event.ticket_types!.map((t, i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-ink-2">{t.title}</span>
                  <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-ink">
                    {formatAmount(t.price)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sale start */}
        {hasSaleInfo && (
          <div className={pad}>
            <p className="section-label mb-1">
              Verkoop start
            </p>
            <p className="font-mono text-sm font-semibold tabular-nums text-ink">
              {formatTicketSaleStart(event.ticket_sale_start!)}
            </p>
          </div>
        )}

        {/* CTA buttons */}
        {hasCTAs && (
          <div className={`flex flex-col gap-2.5 sm:flex-row ${pad}`}>
            {ticketUrl && (
              <a
                href={ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={linkButton}
              >
                <Ticket size={16} />
                Tickets kopen
                <ExternalLink size={12} className="ml-0.5" />
              </a>
            )}
            {websiteUrl && (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={linkButton}
              >
                <Globe size={16} />
                Officiële website
                <ExternalLink size={12} className="ml-0.5" />
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
