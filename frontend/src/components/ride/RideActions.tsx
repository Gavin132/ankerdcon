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
      <div className="card-surface rounded-2xl overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-teal-400 to-cyan-500" />

        {/* Map header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700/60">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/40">
              <MapPin size={13} className="text-teal-600 dark:text-teal-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Route</p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                {fromLabel}{toLabel !== fromLabel ? ` → ${toLabel}` : ""}
              </p>
              <p className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                <Clock size={11} />
                Vertrekt om: {formatDateTime(ride.departure_time)}
              </p>
            </div>
          </div>
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-1.5 rounded-xl bg-teal-500 hover:bg-teal-600 px-3 py-1.5 text-xs font-bold text-white transition-colors"
          >
            <Navigation size={11} />
            Route
            <ExternalLink size={10} />
          </a>
        </div>

        {/* Embedded map */}
        <div className="relative">
          <iframe
            title="Route kaart"
            src={embedUrl}
            className="w-full h-[240px] border-0 block"
            referrerPolicy="no-referrer-when-downgrade"
            loading="lazy"
          />
          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        </div>
      </div>

      {/* ── Parking info ─────────────────────────────────────────── */}
      {ride.parking_info && (
        <div className="card-surface rounded-2xl overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-blue-400 to-indigo-500" />
          <div className="px-4 py-4">
            <div className="flex gap-3 items-start">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <ParkingCircle size={14} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Parkeerinfo</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {ride.parking_info}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
