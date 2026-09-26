import {
  ParkingCircle,
  ExternalLink,
  MapPin,
  Navigation,
  Clock,
} from "lucide-react";
import { buildEmbedUrl, buildMapsOpenUrl } from "../../utils/maps";
import { formatDateTime } from "../../utils/format";
import type { Ride } from "../../types";

interface RideActionsProps {
  ride: Ride;
}

export function RideActions({ ride }: RideActionsProps) {
  const isInbound = ride.direction === "Inbound";
  const fromLabel = ride.start_location;
  const toLabel   = ride.end_location || (isInbound ? "Con locatie" : "Bestemming");
  const embedUrl  = buildEmbedUrl(fromLabel, toLabel !== fromLabel ? toLabel : undefined);
  const openUrl   = ride.end_location
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(fromLabel)}&destination=${encodeURIComponent(toLabel)}`
    : buildMapsOpenUrl("", fromLabel);

  return (
    <div className="space-y-4">
      {/* ── Map (always visible) ──────────────────────────────────── */}
      <div className="card-surface overflow-hidden">
        {/* Map header */}
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
              <MapPin size={14} />
            </div>
            <div className="min-w-0">
              <p className="section-label">Route</p>
              <p className="truncate text-sm font-semibold text-ink">
                {fromLabel}{toLabel !== fromLabel ? ` → ${toLabel}` : ""}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-2">
                <Clock size={11} className="shrink-0 text-ink-3" />
                Vertrekt om: <span className="font-mono tabular-nums text-ink">{formatDateTime(ride.departure_time)}</span>
              </p>
            </div>
          </div>
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-1.5 rounded-xl border-1.5 border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-ink-3"
          >
            <Navigation size={11} />
            Route
            <ExternalLink size={10} className="text-ink-3" />
          </a>
        </div>

        {/* Embedded map */}
        <iframe
          title="Route kaart"
          src={embedUrl}
          className="block h-[240px] w-full border-0"
          referrerPolicy="no-referrer-when-downgrade"
          loading="lazy"
        />
      </div>

      {/* ── Parking info ─────────────────────────────────────────── */}
      {ride.parking_info && (
        <div className="card-surface overflow-hidden">
          <div className="flex items-start gap-3 px-4 py-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
              <ParkingCircle size={14} />
            </div>
            <div className="min-w-0">
              <p className="section-label mb-0.5">Parkeerinfo</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-2">
                {ride.parking_info}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
