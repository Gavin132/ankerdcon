import type { Meal, Ride, RestaurantGap, User } from "../../types";
import { getRideStatus } from "../../utils/rides";
import { restaurantCarGaps } from "../../utils/restaurantCars";

/**
 * Who going to a restaurant still has no car. Mirrors the restaurant car list (RestaurantDetailActions) exactly
 * (drivers come from `restaurant_drivers`; the people going are the linked
 * meal's participants, else the ride's own passengers) so the Hub can never
 * disagree with the ride card. People are counted, not names (`restaurantCarGaps`).
 */
export function computeRestaurantGaps(rides: Ride[], meals: Meal[] = [], users: User[] = []): RestaurantGap[] {
  return rides
    .filter((r) => r.direction === "Restaurant")
    .flatMap((ride) => {
      const { status } = getRideStatus(ride.departure_time);
      if (status === "past") return [];
      const drivers = ride.restaurant_drivers ?? [];
      const meal = ride.linked_meal_id ? meals.find((m) => m.id === ride.linked_meal_id) : undefined;
      const attendees = meal ? (meal.participants ?? []) : ride.passengers;
      const unassigned = restaurantCarGaps(attendees, drivers, users).unassigned.map((person) => person.name);
      if (unassigned.length === 0) return [];
      return [
        {
          id: ride.id,
          location: ride.start_location,
          departureTime: ride.departure_time,
          unassigned,
          linkedMealId: ride.linked_meal_id,
        },
      ];
    });
}
