import { CalendarDays, MapPin, StickyNote, Users } from "lucide-react";
import { dayShort, monthShort } from "../../utils/multiDay";
import { useUsers } from "../../hooks/useUsers";
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
    <div className="py-3 first:pt-0 last:pb-0">
      <dt className="section-label flex items-center gap-1.5">
        <Icon size={12} className="shrink-0" /> {label}
      </dt>
      <dd className="mt-1">{children}</dd>
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
  const { data: users = [] } = useUsers();
  const outliers = tripOutliers(trip, users);

  return (
    // The sheet is already called "Hotel", so this is just the facts, divided by lines: no card of its own.
    <dl className="divide-y divide-line border-b border-line pb-3">
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
          <ul className="space-y-2">
            {outliers.map((o) => (
              <li key={o.name} className="text-sm leading-snug">
                <span className="break-words font-medium text-ink">{o.name}</span>
                <span className="block text-[13px] text-ink-3">{outlierText[o.kind](o.days)}</span>
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

    </dl>
  );
}
