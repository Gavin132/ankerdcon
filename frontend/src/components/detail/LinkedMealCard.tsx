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
    <div className="card-surface rounded-2xl overflow-hidden">
      <div className="h-[3px] bg-gradient-to-r from-amber-400 to-orange-400" />
      <div className="px-5 py-4">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
          Gekoppeld etentje
        </h2>
        <Link
          to={routes.meal.view(meal.id)}
          className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700
                     bg-slate-50 dark:bg-slate-800 px-4 py-3
                     hover:border-amber-300 dark:hover:border-amber-500/40
                     hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/10">
            <Utensils size={16} className="text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {meal.meal_name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {formatMealTime(meal.time)}
              {meal.location ? ` · ${meal.location}` : ""}
            </p>
          </div>
          <ExternalLink size={14} className="shrink-0 text-slate-400" />
        </Link>
      </div>
    </div>
  );
}
