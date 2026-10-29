import { describe, expect, it } from "vitest";
import { rideSearchTitle } from "./rideSearch";

const meals = [{ id: "m1", meal_name: "Diner bij de Italiaan" }];

describe("rideSearchTitle", () => {
  it("is the driver for an ordinary ride", () => {
    expect(rideSearchTitle({ direction: "Inbound", driver: "Sam", linked_meal_id: undefined }, meals, "Sam")).toBe("Sam");
  });

  it("is the ride to the meal for a restaurant ride, which has no driver", () => {
    expect(rideSearchTitle({ direction: "Restaurant", driver: "", linked_meal_id: "m1" }, meals, "")).toBe("Rit naar Diner bij de Italiaan");
  });

  it("is never empty when the meal is gone", () => {
    expect(rideSearchTitle({ direction: "Restaurant", driver: "", linked_meal_id: "weg" }, meals, "")).toBe("Rit naar restaurant");
  });
});
