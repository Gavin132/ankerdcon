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
    <div className="card-surface rounded-2xl overflow-hidden">
      <div className="h-[3px] bg-gradient-to-r from-amber-400 to-orange-400" />
      <div className="px-5 py-4">
      <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
        Gerelateerde etentje(s) ({meals.length})
      </h2>
      <div className="space-y-2">
        {meals.map((meal) => (
          <Link
            key={meal.id}
            to={routes.meal.view(meal.id)}
            className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700
                       bg-slate-50 dark:bg-slate-800 px-4 py-3
                       hover:border-amber-300 dark:hover:border-amber-500/40
                       hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/10">
              <UtensilsCrossed size={15} className="text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {meal.meal_name}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <Clock size={10} />
                  {formatDateTime(meal.time)}
                </span>
                {meal.location && (
                  <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <MapPin size={10} />
                    {meal.location}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {meal.participants.length > 0 && (
                <span className="text-xs font-semibold text-slate-400">
                  {meal.participants.length} aangemeld
                </span>
              )}
              <ChevronRight size={14} className="text-slate-400" />
            </div>
          </Link>
        ))}
      </div>
      </div>
    </div>
  );
}
