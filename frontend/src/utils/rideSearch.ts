import type { Meal, Ride } from "../types";

/**
 * What a ride is called in the search results. An ordinary ride is its driver's; a restaurant ride has no driver (its
 * cars are listed inside it), so it is the ride to its meal, like the title of its own page.
 */
export function rideSearchTitle(ride: Pick<Ride, "direction" | "driver" | "linked_meal_id">, meals: Pick<Meal, "id" | "meal_name">[], driverName: string): string {
  if (ride.direction !== "Restaurant") return driverName;
  const meal = ride.linked_meal_id ? meals.find((m) => m.id === ride.linked_meal_id) : undefined;
  return `Rit naar ${meal?.meal_name ?? "restaurant"}`;
}
