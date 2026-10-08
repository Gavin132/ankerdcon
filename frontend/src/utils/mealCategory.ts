import type { Meal, MealCategory } from "../types";

/**
 * What an item with no category has: the old "etentje". Used for rows saved before
 * categories existed, and for the whole app while the categories migration has not
 * run, so a missing category never hides a signup button or a price.
 */
export const FALLBACK_CATEGORY: MealCategory = {
  id: "",
  name: "Eten",
  sort_order: 0,
  has_signup: true,
  has_cost: true,
  has_transport: true,
  is_meal: true,
};

/** The category of an activity (the backend sends it along with the activity). */
export function mealCategory(meal: Pick<Meal, "category">): MealCategory {
  return meal.category ?? FALLBACK_CATEGORY;
}

/** Activities that count as a meal: the ones "nergens bij" is about. */
export function isMealItem(meal: Pick<Meal, "category">): boolean {
  return mealCategory(meal).is_meal;
}

/** The category a new activity starts on: the first one, which is Eten unless an admin moved it. */
export function defaultCategory(categories: MealCategory[]): MealCategory {
  return [...categories].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "nl"))[0] ?? FALLBACK_CATEGORY;
}

/** "3 activiteiten" / "1 activiteit". */
export function activityCount(n: number): string {
  return `${n} ${n === 1 ? "activiteit" : "activiteiten"}`;
}
