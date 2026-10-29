import { groupPeople, isIn, type Person } from "./people";
import type { RestaurantDriver, User } from "../types";

export interface RestaurantCarGaps {
  /** The people going who are neither driving nor in a car, each person once. */
  unassigned: Person[];
  /** Whether anyone going is not a driver, i.e. needs a seat at all. */
  hasPassengers: boolean;
}

/**
 * Who going to a restaurant still has no car. The one place this is worked out: the Hub's "Voor jou", the ride/meal
 * page and the Vervoer sheet all use it, so they cannot disagree. `attendees` are stored names (the linked meal's
 * participants, else the ride's passengers) and so are the cars' drivers and passengers, so someone who is on the meal
 * as "Sam" and in a car as their Discord username or old name has a car, and someone on the list under two names is
 * one person, not two.
 */
export function restaurantCarGaps(attendees: string[], drivers: RestaurantDriver[], users: User[] = []): RestaurantCarGaps {
  const people = groupPeople(attendees, users);
  const driving = new Set(drivers.map((d) => d.name.toLowerCase()));
  const inACar = new Set([...driving, ...drivers.flatMap((d) => d.passengers).map((p) => p.toLowerCase())]);
  return {
    unassigned: people.filter((person) => !isIn(person, inACar)),
    hasPassengers: people.some((person) => !isIn(person, driving)),
  };
}
