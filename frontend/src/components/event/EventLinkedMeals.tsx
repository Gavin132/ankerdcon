import { Link } from "react-router-dom";
import { UtensilsCrossed, Clock, MapPin, ChevronRight } from "lucide-react";
import { formatDateTime } from "../../utils/format";
import { routes } from "../../config/routes";
import type { Meal } from "../../types";

interface EventLinkedMealsProps {
  meals: Meal[];
}

export function EventLinkedMeals({ meals }: EventLinkedMealsProps) {
  if (meals.length === 0) return null;

  return (
    <div className="card-surface overflow-hidden">
      <h2 className="section-label px-5 pb-2.5 pt-4">
        Gerelateerde etentje(s) ({meals.length})
      </h2>
      <div className="divide-y divide-line border-t border-line">
        {meals.map((meal) => (
          <Link
            key={meal.id}
            to={routes.meal.view(meal.id)}
            className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-sunken"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink group-hover:bg-surface">
              <UtensilsCrossed size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">
                {meal.meal_name}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span className="flex items-center gap-1 font-mono text-[11.5px] tabular-nums text-ink-2">
                  <Clock size={10} />
                  {formatDateTime(meal.time)}
                </span>
                {meal.location && (
                  <span className="flex min-w-0 items-center gap-1 text-xs text-ink-3">
                    <MapPin size={10} className="shrink-0" />
                    <span className="truncate">{meal.location}</span>
                  </span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {meal.participants.length > 0 && (
                <span className="text-xs font-semibold text-ink-3">
                  {meal.participants.length} aangemeld
                </span>
              )}
              <ChevronRight size={14} className="text-ink-3 transition-colors group-hover:text-ink" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
