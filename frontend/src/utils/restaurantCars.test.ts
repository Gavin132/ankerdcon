import { describe, expect, it } from "vitest";
import { restaurantCarGaps } from "./restaurantCars";
import { computeRestaurantGaps } from "../components/hub/ComputeRestaurantGap";
import { computeAllActions } from "./actionItems";
import type { Meal, RestaurantDriver, Ride, User } from "../types";

const members = [
  { id: "1", name: "Marshmallow", discord_username: "marshxmallow.fluff", aliases: ["Marsh"] },
  { id: "2", name: "Sam", discord_username: "sam", aliases: ["samdraws"] },
  { id: "3", name: "Robin", discord_username: "robin", aliases: [] },
] as unknown as User[];

const car = (name: string, passengers: string[] = []): RestaurantDriver => ({ name, seats: 4, passengers });

describe("restaurantCarGaps", () => {
  it("counts a member who is on the list under two names once", () => {
    const { unassigned } = restaurantCarGaps(["Marshmallow", "marshxmallow.fluff", "Robin"], [car("Sam")], members);
    expect(unassigned.map((p) => p.name)).toEqual(["Marshmallow", "Robin"]);
  });

  it("does not miss someone who is in a car under another of their names", () => {
    // On the meal as Marshmallow, in Sam's car as her Discord username; Sam drives as a former name.
    const { unassigned } = restaurantCarGaps(
      ["Marshmallow", "Sam", "Robin"],
      [car("samdraws", ["marshxmallow.fluff"])],
      members,
    );
    expect(unassigned.map((p) => p.name)).toEqual(["Robin"]);
  });

  it("is case-insensitive and keeps unknown names (guests) as people of their own", () => {
    const { unassigned } = restaurantCarGaps(["Guest", "guest", "Other"], [car("Sam", ["GUEST"])], members);
    expect(unassigned.map((p) => p.name)).toEqual(["Other"]);
  });

  it("says whether anyone besides the drivers is going", () => {
    expect(restaurantCarGaps(["Sam", "samdraws"], [car("Sam")], members).hasPassengers).toBe(false);
    expect(restaurantCarGaps(["Sam", "Robin"], [car("Sam")], members).hasPassengers).toBe(true);
  });

  it("works without a member list: every name is a person", () => {
    expect(restaurantCarGaps(["A", "B"], [car("A")]).unassigned.map((p) => p.name)).toEqual(["B"]);
  });
});

describe("the Hub's restaurant gaps use the same count", () => {
  const meal = { id: "m1", participants: ["Marshmallow", "marshxmallow.fluff", "Sam", "Robin"] } as unknown as Meal;
  const ride = {
    id: "r1", direction: "Restaurant", start_location: "Da Marco", departure_time: "2099-01-01 19:00",
    linked_meal_id: "m1", passengers: [], restaurant_drivers: [car("Sam")],
  } as unknown as Ride;

  it("counts people, not names", () => {
    const gaps = computeRestaurantGaps([ride], [meal], members);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].unassigned).toEqual(["Marshmallow", "Robin"]);
    // Without the members the two names cannot be joined, which is how it looked.
    expect(computeRestaurantGaps([ride], [meal])[0].unassigned).toHaveLength(3);
  });

  it("reaches the Voor jou actions", () => {
    const actions = computeAllActions({ rides: [ride], meals: [meal], users: members, expenses: [], myNames: ["Sam"] });
    expect(actions).toHaveLength(1);
    expect(actions[0].kind === "restaurant_gap" && actions[0].gap.unassigned.length).toBe(2);
  });
});
