import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, Utensils } from "lucide-react";
import { routes } from "../../config/routes";
import { getNow } from "../../store/time.store";
import { todayKey } from "../../utils/date";
import { formatTime } from "../../utils/format";
import { listItem } from "../../utils/motion";
import type { Meal } from "../../types";

/** How long after its start a meal stays on the hub. */
const LINGER_MS = 3 * 60 * 60 * 1000;

interface MealTodayCardProps {
  meals: Meal[];
  /** Every name the signed-in user can appear under in `participants`. */
  myNames: string[];
}

/**
 * Hub shortcut for a day with a mealplan: one card per meal that's today, straight
 * to its page, with whether you're on the list. Sits above the quick-ride cards.
 */
export function MealTodayCard({ meals, myNames }: MealTodayCardProps) {
  const now = getNow().getTime();
  const today = todayKey();
  const todays = meals
    .filter((m) => m.time.slice(0, 10) === today)
    .filter((m) => {
      const start = new Date(m.time.replace(" ", "T")).getTime();
      return isNaN(start) || now - start < LINGER_MS;
    })
    .sort((a, b) => a.time.localeCompare(b.time));

  if (todays.length === 0) return null;

  return (
    // Its own animated wrapper (rather than the hub's) so a day without a meal leaves no empty gap.
    <motion.div variants={listItem} className="space-y-2">
      {todays.map((meal) => {
        const eating = (meal.participants ?? []).some((p) => myNames.includes(p));
        const count = meal.participants?.length ?? 0;
        return (
          <Link key={meal.id} to={routes.meal.view(meal.id)} className="card-surface-hover flex items-center gap-3 p-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
              <Utensils size={16} />
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3">
                Vandaag eten · {formatTime(meal.time)}
              </span>
              <span className="mt-0.5 block truncate text-[14px] font-semibold text-ink">{meal.meal_name}</span>
              {meal.location && <span className="block truncate text-[12px] text-ink-2">{meal.location}</span>}
            </span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${
                eating
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
              }`}
            >
              {eating ? "Je eet mee" : count > 0 ? `${count} eten mee` : "Nog niemand"}
            </span>
            <ChevronRight size={15} className="shrink-0 text-ink-3" />
          </Link>
        );
      })}
    </motion.div>
  );
}
