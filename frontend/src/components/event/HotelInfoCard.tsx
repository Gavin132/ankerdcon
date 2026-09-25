import { BedDouble, CalendarDays, MapPin, StickyNote, Users } from "lucide-react";
import { dayShort, monthShort } from "../../utils/multiDay";
import { tripOutliers, type Trip, type TripDay, type TripOutlier } from "../../utils/trips";
import type { CalendarEvent } from "../../types";

interface HotelInfoCardProps {
  event: CalendarEvent;
  trip: Trip;
}

const dayLabel = (d: TripDay) => `${dayShort(d.date)} ${d.date.getDate()} ${monthShort(d.date)}`;

const outlierText: Record<TripOutlier["kind"], (days: TripDay[]) => string> = {
  "leaves-early": (days) => `vertrekt ${dayLabel(days[days.length - 1])}`,
  "arrives-late": (days) => `komt ${dayLabel(days[0])}`,
  "some-days": (days) => `alleen ${days.map((d) => dayShort(d.date)).join(", ")}`,
};

function Row({ icon: Icon, label, children }: { icon: typeof MapPin; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 px-5 py-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
        <Icon size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="section-label mb-1">{label}</p>
        {children}
      </div>
    </div>
  );
}

/**
 * Everything about the hotel except the rooms themselves, at the top of Event ›
 * Hotel: the address, when the stay starts and ends, who arrives late or leaves
 * early, and the hotel's own notes (check-in and check-out times, breakfast…).
 */
export function HotelInfoCard({ event, trip }: HotelInfoCardProps) {
  const location = event.hotel_location || event.location;
  const stay = trip.days.filter((d) => d.ev.is_hotel);
  const nights = stay.length > 0 ? stay : trip.days;
  const first = nights[0];
  const last = nights[nights.length - 1];
  const outliers = tripOutliers(trip);

  return (
    <div className="card-surface overflow-hidden">
      <div className="flex items-center gap-2 px-5 pb-1 pt-4">
        <BedDouble size={13} className="text-ink-3" />
        <p className="section-label">Hotel &amp; overnachting</p>
      </div>

      {location && (
        <Row icon={MapPin} label="Adres">
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(location)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm leading-relaxed text-ink hover:underline"
          >
            {location}
          </a>
        </Row>
      )}

      {first && (
        <Row icon={CalendarDays} label="Verblijf">
          <p className="text-sm leading-relaxed text-ink">
            {first === last ? dayLabel(first) : `${dayLabel(first)} t/m ${dayLabel(last)}`}
          </p>
        </Row>
      )}

      {outliers.length > 0 && (
        <Row icon={Users} label="Aankomst & vertrek">
          <ul className="space-y-1">
            {outliers.map((o) => (
              <li key={o.name} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium text-ink">{o.name}</span>
                <span className="text-ink-3">{outlierText[o.kind](o.days)}</span>
              </li>
            ))}
          </ul>
        </Row>
      )}

      {event.hotel_info && (
        <Row icon={StickyNote} label="Info">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{event.hotel_info}</p>
        </Row>
      )}

      <div className="h-2" />
    </div>
  );
}
