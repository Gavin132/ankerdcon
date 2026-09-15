import { ParkingSquare, Leaf, StickyNote, Bus, MapPin, ExternalLink, Navigation } from "lucide-react";
import { buildEmbedUrl, buildMapsOpenUrl } from "../../utils/maps";
import type { Meal } from "../../types";

interface MealPracticalProps {
  meal: Meal;
}

function PracticalRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="section-label mb-0.5">{label}</p>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{children}</p>
      </div>
    </div>
  );
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
        <div className="card-surface overflow-hidden">
          {/* Map header */}
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
                <MapPin size={14} />
              </div>
              <div className="min-w-0">
                <p className="section-label">Locatie</p>
                <p className="truncate text-sm font-semibold text-ink">{meal.location}</p>
              </div>
            </div>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex shrink-0 items-center gap-1.5 rounded-xl border-1.5 border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-ink-3"
              >
                <Navigation size={11} />
                Route
                <ExternalLink size={10} className="text-ink-3" />
              </a>
            )}
          </div>

          {/* Embedded map */}
          <iframe
            title={`Kaart — ${meal.location}`}
            src={embedUrl}
            className="block h-[220px] w-full border-0"
            referrerPolicy="no-referrer-when-downgrade"
            loading="lazy"
          />
        </div>
      )}

      {/* ── Practical info ───────────────────────────────────────── */}
      {hasPractical && (
        <div className="card-surface overflow-hidden">
          <div className="space-y-3 px-4 py-4">
            <h2 className="section-label">Praktisch</h2>

            {meal.transport_needed && (
              <PracticalRow icon={<Bus size={14} />} label="Vervoer">
                Vervoer is nodig voor dit evenement.
              </PracticalRow>
            )}

            {meal.parking_info && (
              <PracticalRow icon={<ParkingSquare size={14} />} label="Parkeren">
                {meal.parking_info}
              </PracticalRow>
            )}

            {meal.dietary_options && (
              <PracticalRow icon={<Leaf size={14} />} label="Dieet opties">
                {meal.dietary_options}
              </PracticalRow>
            )}

            {meal.extra_notes && (
              <PracticalRow icon={<StickyNote size={14} />} label="Extra info">
                {meal.extra_notes}
              </PracticalRow>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
