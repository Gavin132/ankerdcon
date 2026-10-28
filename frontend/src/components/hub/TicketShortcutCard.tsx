import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Ticket as TicketIcon } from "lucide-react";
import { routes } from "../../config/routes";
import { buildTrip, currentTripId, isTripOver } from "../../utils/trips";
import { useLocalTicketsStore } from "../../store/localTickets.store";
import type { CalendarEvent } from "../../types";

/**
 * A shortcut to "Mijn ticket" for whichever trip is current — a row in the
 * Hub's "shortcuts" card, next to "Locatie pingen". Dynamic in the sense that its text
 * (and whether it shows at all) follows what's actually saved on this
 * device, not a fixed label: nothing to save yet nudges you to add one,
 * already having one turns it into a quick way to pull it back up.
 */
export function TicketShortcutCard({ events }: { events: CalendarEvent[] }) {
  const navigate = useNavigate();
  const hydrate = useLocalTicketsStore((s) => s.hydrate);
  const items = useLocalTicketsStore((s) => s.items);
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const tripId = currentTripId(events);
  const trip = tripId ? buildTrip(events, tripId) : null;
  if (!trip || isTripOver(trip)) return null;

  const count = items.filter((t) => t.eventId === trip.id).length;
  const hasTicket = count > 0;

  return (
    <button
      type="button"
      onClick={() => navigate(`${routes.trip.view(trip.id)}?openTicket=1`)}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-sunken"
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          hasTicket ? "pill-ok" : "pill-warn"
        }`}
      >
        <TicketIcon size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">
          {hasTicket ? "Ticket opgeslagen" : "Nog geen ticket opgeslagen"}
        </span>
        <span className="block truncate text-xs text-ink-3">
          {hasTicket ? `Bekijk voor ${trip.title}` : `Bewaar 'm voor ${trip.title}`}
        </span>
      </span>
      <ChevronRight size={14} className="shrink-0 text-ink-3" />
    </button>
  );
}
