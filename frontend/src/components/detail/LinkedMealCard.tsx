import { Link } from "react-router-dom";
import { Utensils, ChevronRight } from "lucide-react";
import { routes } from "../../config/routes";
import { formatDateTime } from "../../utils/format";
import type { Meal } from "../../types";

/** The activity a ride is for: the whole card is the link. */
export function LinkedMealCard({ meal }: { meal: Meal }) {
  return (
    <Link to={routes.meal.view(meal.id)} className="card-surface card-surface-hover block px-4 py-4">
      <h2 className="section-label mb-3">Gekoppelde activiteit</h2>
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
          <Utensils size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{meal.meal_name}</p>
          <p className="truncate text-xs text-ink-2">
            {formatDateTime(meal.time)}
            {meal.location ? ` · ${meal.location}` : ""}
          </p>
        </div>
        <ChevronRight size={16} className="shrink-0 text-ink-3" />
      </div>
    </Link>
  );
}
