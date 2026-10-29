import { ExternalLink, Navigation } from "lucide-react";
import { buildEmbedUrl, buildMapsOpenUrl } from "../../utils/maps";
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

  // The cards sit straight in the page's column, spaced like every other block of it. The route is in the hero.
  return (
    <>
      <div className="card-surface overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2">
          <h2 className="section-label">Route</h2>
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary min-h-10 shrink-0 px-3 text-xs"
          >
            <Navigation size={12} />
            Route openen
            <ExternalLink size={12} />
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
        <div className="card-surface px-4 py-4">
          <h2 className="section-label mb-0.5">Parkeerinfo</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{ride.parking_info}</p>
        </div>
      )}
    </>
  );
}
