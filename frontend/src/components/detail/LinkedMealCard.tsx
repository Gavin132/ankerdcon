import { Link } from "react-router-dom";
import { Utensils, ExternalLink } from "lucide-react";
import { routes } from "../../config/routes";
import type { Meal } from "../../types";

function formatMealTime(time: string) {
  const d = new Date(time);
  if (isNaN(d.getTime())) return time;
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" }) +
    " · " +
    d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

export function LinkedMealCard({ meal }: { meal: Meal }) {
  return (
    <div className="card-surface overflow-hidden">
      <div className="px-4 py-4">
        <h2 className="section-label mb-3">
          Gekoppeld etentje
        </h2>
        <Link
          to={routes.meal.view(meal.id)}
          className="flex items-center gap-3 rounded-xl border-1.5 border-line bg-surface px-3.5 py-3 transition-colors hover:border-ink-3"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
            <Utensils size={15} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">
              {meal.meal_name}
            </p>
            <p className="truncate text-xs text-ink-2">
              <span className="font-mono tabular-nums">{formatMealTime(meal.time)}</span>
              {meal.location ? ` · ${meal.location}` : ""}
            </p>
          </div>
          <ExternalLink size={14} className="shrink-0 text-ink-3" />
        </Link>
      </div>
    </div>
  );
}
