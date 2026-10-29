import { ExternalLink } from "lucide-react";
import { formatDateRange } from "../../utils/multiDay";
import { useUsers } from "../../hooks/useUsers";
import { OutlierRow } from "../trip/Outliers";
import { tripOutliers, type Trip } from "../../utils/trips";
import type { CalendarEvent } from "../../types";

interface HotelInfoCardProps {
  event: CalendarEvent;
  trip: Trip;
}

/** The nights of the stay as a range, "di 17 – do 19 nov": the hotel days, or the whole trip when none is marked. */
export function stayRange(trip: Trip): string {
  const stay = trip.days.filter((d) => d.ev.is_hotel);
  return formatDateRange((stay.length > 0 ? stay : trip.days).map((d) => d.date));
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <dt className="section-label">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}

/**
 * Everything about the hotel except the rooms themselves, at the top of Event ›
 * Hotel: the address, who arrives late or leaves early, and the hotel's own notes
 * (check-in and check-out times, breakfast…). The dates of the stay are the sheet's subtitle.
 */
export function HotelInfoCard({ event, trip }: HotelInfoCardProps) {
  const location = event.hotel_location || event.location;
  const { data: users = [] } = useUsers();
  const outliers = tripOutliers(trip, users);

  if (!location && outliers.length === 0 && !event.hotel_info) return null;

  return (
    // The sheet is already called "Hotel", so this is just the facts, divided by lines: no card of its own.
    <dl className="divide-y divide-line border-b border-line pb-3">
      {location && (
        <Row label="Adres">
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(location)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hit-area inline-flex items-center gap-1.5 text-sm leading-relaxed text-brand-text hover:underline"
          >
            {location}
            <ExternalLink size={12} className="shrink-0" />
          </a>
        </Row>
      )}

      {outliers.length > 0 && (
        <Row label="Aankomst & vertrek">
          <ul className="space-y-2">
            {outliers.map((o) => (
              <OutlierRow key={o.name} outlier={o} />
            ))}
          </ul>
        </Row>
      )}

      {event.hotel_info && (
        <Row label="Info">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{event.hotel_info}</p>
        </Row>
      )}
    </dl>
  );
}
