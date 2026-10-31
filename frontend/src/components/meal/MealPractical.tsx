import { ExternalLink, Navigation } from "lucide-react";
import { buildEmbedUrl, buildMapsOpenUrl } from "../../utils/maps";
import { safeHref } from "../../utils/validation";
import { mealCategory } from "../../utils/mealCategory";
import type { Meal } from "../../types";

interface MealPracticalProps {
  meal: Meal;
}

/** One practical fact: a small label and the text under it (no icon: the label says what it is). */
function PracticalRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="section-label mb-0.5">{label}</p>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{children}</p>
    </div>
  );
}

export function MealPractical({ meal }: MealPracticalProps) {
  const category = mealCategory(meal);
  // Dietary wishes only make sense for a meal.
  const showDietary = category.is_meal && !!meal.dietary_options;
  const hasPractical = !!(meal.parking_info || showDietary || meal.extra_notes);

  const hasLocation = !!(meal.location?.trim());
  const embedUrl = hasLocation ? buildEmbedUrl(meal.location) : null;
  // The exact Google Maps link the organiser pasted wins over a search for the address.
  const customUrl = safeHref(meal.maps_url);
  const mapsUrl = hasLocation || customUrl ? buildMapsOpenUrl(customUrl ?? "", meal.location) : null;

  if (!hasPractical && !hasLocation && !customUrl) return null;

  // The cards sit straight in the page's column, so they are spaced like every other block of it.
  return (
    <>
      {/* ── Location map ─────────────────────────────────────────── */}
      {hasLocation && embedUrl && (
        <div className="card-surface overflow-hidden">
          {/* Map header: the address is in the hero, so the label and the way there are all it needs. */}
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2">
            <h2 className="section-label">Kaart</h2>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary btn-compact shrink-0 px-3"
              >
                <Navigation size={12} />
                Route
                <ExternalLink size={12} />
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

      {/* A link but no address: no map to embed, only the way there. */}
      {!hasLocation && mapsUrl && (
        <div className="card-surface flex items-center justify-between gap-3 px-4 py-3">
          <h2 className="section-label">Locatie</h2>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary px-3.5"
          >
            <Navigation size={14} />
            Route
          </a>
        </div>
      )}

      {/* ── Practical info ───────────────────────────────────────── */}
      {hasPractical && (
        <div className="card-surface overflow-hidden">
          <div className="space-y-4 px-4 py-4">
            <h2 className="section-label">Praktisch</h2>

            {meal.parking_info && (
              <PracticalRow label="Parkeren">
                {meal.parking_info}
              </PracticalRow>
            )}

            {showDietary && (
              <PracticalRow label="Dieetopties">
                {meal.dietary_options}
              </PracticalRow>
            )}

            {meal.extra_notes && (
              <PracticalRow label="Extra info">
                {meal.extra_notes}
              </PracticalRow>
            )}
          </div>
        </div>
      )}
    </>
  );
}
