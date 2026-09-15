import { BedDouble, ChevronRight, MapPin, StickyNote } from "lucide-react";
import type { CalendarEvent } from "../../types";

interface HotelInfoCardProps {
  event: CalendarEvent;
  onHotelClick: () => void;
}

/** Shown in place of con-day content on a hotel-only travel day. */
export function HotelInfoCard({ event, onHotelClick }: HotelInfoCardProps) {
  const location = event.hotel_location || event.location;

  return (
    <div className="card-surface overflow-hidden">
      <div className="flex items-center gap-2 px-5 pb-1 pt-4">
        <BedDouble size={13} className="text-ink-3" />
        <p className="section-label">
          Hotel &amp; overnachting
        </p>
      </div>

      {location && (
        <div className="flex items-start gap-4 px-5 py-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
            <MapPin size={14} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="section-label mb-1">
              Locatie
            </p>
            <p className="text-sm leading-relaxed text-ink">
              {location}
            </p>
          </div>
        </div>
      )}

      {event.hotel_info && (
        <div className="flex items-start gap-4 px-5 py-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
            <StickyNote size={14} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="section-label mb-1">
              Info
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
              {event.hotel_info}
            </p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onHotelClick}
        className="group mt-1 flex w-full items-center gap-4 border-t border-line px-5 py-3.5 text-left transition-colors hover:bg-sunken"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink group-hover:bg-surface">
          <BedDouble size={14} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">
            Bekijk hotelkamers
          </p>
        </div>
        <ChevronRight
          size={15}
          className="shrink-0 text-ink-3 transition-colors group-hover:text-ink"
        />
      </button>
    </div>
  );
}
