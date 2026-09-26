import { describe, expect, it } from "vitest";
import { planCarLoads } from "./carBalance";

const car = (id: string, capacity: number, load: number, at: number) => ({ id, capacity, load, departsAt: at });
const range = (plan: ReturnType<typeof planCarLoads>) => plan.cars.map((c) => [c.low, c.high]);

describe("planCarLoads", () => {
  it("gives every car an even share to start with", () => {
    // 11 people, three 5-seaters, all empty: the first car should take 3–4.
    const plan = planCarLoads(11, [car("a", 5, 0, 1), car("b", 5, 0, 2), car("c", 5, 0, 3)]);
    expect(plan.cars[0]).toMatchObject({ low: 3, high: 4 });
    expect(plan.seatShortage).toBe(0);
    expect(plan.withoutSeat).toBe(11);
  });

  it("makes the later cars compensate when the first leaves light", () => {
    // The first car has 2, so the second has to take 4–5.
    const plan = planCarLoads(11, [car("a", 5, 2, 1), car("b", 5, 0, 2), car("c", 5, 0, 3)]);
    expect(plan.cars[0].status).toBe("short");
    expect(plan.cars[1]).toMatchObject({ low: 4, high: 5 });
  });

  it("puts everyone after a light second car at full", () => {
    // Second car leaves with 4: the third has to be full, 5.
    const plan = planCarLoads(11, [car("a", 5, 2, 1), car("b", 5, 4, 2), car("c", 5, 0, 3)]);
    expect(range(plan)[2]).toEqual([5, 5]);
    // 4 is still within the second car's 4–5; it just leaves the third no slack.
    expect(plan.cars[1].status).toBe("ok");
  });

  it("orders cars by departure, not by the order they were given", () => {
    const plan = planCarLoads(11, [car("c", 5, 0, 3), car("a", 5, 2, 1), car("b", 5, 0, 2)]);
    expect(plan.cars.map((c) => c.rideId)).toEqual(["a", "b", "c"]);
    expect(plan.cars[1]).toMatchObject({ low: 4, high: 5 });
  });

  it("is happy when the cars are filled evenly", () => {
    const plan = planCarLoads(11, [car("a", 5, 4, 1), car("b", 5, 4, 2), car("c", 5, 3, 3)]);
    expect(plan.cars.map((c) => c.status)).toEqual(["ok", "ok", "ok"]);
    expect(plan.withoutSeat).toBe(0);
  });

  it("counts a car that takes more than its range as over, which is fine", () => {
    const plan = planCarLoads(6, [car("a", 5, 5, 1), car("b", 5, 1, 2)]);
    expect(plan.cars[0].status).toBe("over");
    expect(plan.cars[1]).toMatchObject({ low: 1, high: 1, status: "ok" });
  });

  it("reports when there are not enough seats at all", () => {
    const plan = planCarLoads(12, [car("a", 4, 0, 1), car("b", 4, 0, 2)]);
    expect(plan.seatShortage).toBe(4);
    // Both must be full; there is no way to take everyone.
    expect(range(plan)).toEqual([[4, 4], [4, 4]]);
  });

  it("copes with a small later car by asking more of the earlier one", () => {
    // Seven people; the second car only has 2 seats, so the first must take 5.
    const plan = planCarLoads(7, [car("a", 5, 0, 1), car("b", 2, 0, 2)]);
    expect(plan.cars[0]).toMatchObject({ low: 5, high: 5 });
  });

  it("gives no advice range above the seats a car has", () => {
    const plan = planCarLoads(20, [car("a", 3, 0, 1), car("b", 3, 0, 2)]);
    expect(plan.cars.every((c) => c.high <= 3)).toBe(true);
  });
});
