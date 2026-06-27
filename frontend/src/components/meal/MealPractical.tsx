import { ParkingSquare, Leaf, StickyNote, Bus, MapPin, ExternalLink, Navigation } from "lucide-react";
import { buildEmbedUrl, buildMapsOpenUrl } from "../../utils/maps";
import type { Meal } from "../../types";

interface MealPracticalProps {
  meal: Meal;
}

export function MealPractical({ meal }: MealPracticalProps) {
  const hasPractical = !!(
    meal.transport_needed ||
    meal.parking_info ||
    meal.dietary_options ||
    meal.extra_notes
  );

  const hasLocation = !!(meal.location?.trim());
  const embedUrl = hasLocation ? buildEmbedUrl(meal.location) : null;
  const mapsUrl = hasLocation ? buildMapsOpenUrl("", meal.location) : null;

  if (!hasPractical && !hasLocation) return null;

  return (
    <div className="space-y-4">
      {/* ── Location map ─────────────────────────────────────────── */}
      {hasLocation && embedUrl && (
        <div className="card-surface rounded-2xl overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-sky-400 to-blue-500" />

          {/* Map header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/40">
                <MapPin size={13} className="text-sky-600 dark:text-sky-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Locatie</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{meal.location}</p>
              </div>
            </div>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 flex items-center gap-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 px-3 py-1.5 text-xs font-bold text-white transition-colors"
              >
                <Navigation size={11} />
                Route
                <ExternalLink size={10} />
              </a>
            )}
          </div>

          {/* Embedded map */}
          <div className="relative">
            <iframe
              title={`Kaart — ${meal.location}`}
              src={embedUrl}
              className="w-full h-[220px] border-0 block"
              referrerPolicy="no-referrer-when-downgrade"
              loading="lazy"
            />
            {/* Subtle dark overlay at bottom for the Google logo */}
            <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
          </div>
        </div>
      )}

      {/* ── Practical info ───────────────────────────────────────── */}
      {hasPractical && (
        <div className="card-surface rounded-2xl overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-amber-400 to-orange-400" />
          <div className="px-4 py-4 space-y-3">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Praktisch</h2>

            {meal.transport_needed && (
              <div className="flex gap-3 items-start">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
                  <Bus size={14} className="text-sky-600 dark:text-sky-400" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-0.5">Vervoer</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    Vervoer vanuit het hotel is nodig voor dit evenement.
                  </p>
                </div>
              </div>
            )}

            {meal.parking_info && (
              <div className="flex gap-3 items-start">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <ParkingSquare size={14} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-0.5">Parkeren</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{meal.parking_info}</p>
                </div>
              </div>
            )}

            {meal.dietary_options && (
              <div className="flex gap-3 items-start">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Leaf size={14} className="text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-0.5">Dieet opties</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{meal.dietary_options}</p>
                </div>
              </div>
            )}

            {meal.extra_notes && (
              <div className="flex gap-3 items-start">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <StickyNote size={14} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-0.5">Extra info</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{meal.extra_notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
