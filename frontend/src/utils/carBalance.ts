import { getRideStatus } from "./rides";
import type { Ride } from "../types";

/**
 * How full each car should leave, so that nobody is left behind.
 *
 * Cars go one after another. Whatever an earlier car leaves without, the later
 * cars have to take, so every car gets a range to aim for from what is still
 * to be carried when its turn comes:
 *
 *   still to carry (R)  = everyone who needs a seat − those in the cars before it
 *   cars still to go (n) = this car and every later one
 *   lowest it can leave with = R − the seats of all later cars (never below what
 *                              an even share needs: floor(R / n))
 *   highest to aim for       = ceil(R / n), at most its seats
 *
 * Eleven people in three 5-seaters: the first car should take 3–4. If it leaves
 * with 2, the second has to take 4–5; if that one leaves with 4, the third has
 * to go with 5. Loads are always today's sign-ups: cars rarely leave on time, so
 * nothing is ever locked in.
 */

export interface CarGuidance {
  rideId: string;
  /** How many the car should have at least, and at most, to keep everyone on board. */
  low: number;
  high: number;
  load: number;
  capacity: number;
  /** Fewer than `low` ("short"), within the range ("ok") or more than `high` ("over"). */
  status: "short" | "ok" | "over";
}

export interface CarPlan {
  /** Everyone who needs a seat in this direction. */
  people: number;
  /** Seats across all the cars. */
  seats: number;
  /** People not in any car yet. */
  withoutSeat: number;
  /** Seats missing altogether, i.e. people who cannot be taken however the cars fill. */
  seatShortage: number;
  cars: CarGuidance[];
}

interface Car {
  id: string;
  capacity: number;
  load: number;
  departsAt: number;
}

/** The maths, on plain numbers. `people` counts everyone who needs a seat, including drivers. */
export function planCarLoads(people: number, cars: Car[]): CarPlan {
  const ordered = [...cars].sort((a, b) => a.departsAt - b.departsAt || a.id.localeCompare(b.id));
  const seats = ordered.reduce((sum, c) => sum + c.capacity, 0);
  const seated = ordered.reduce((sum, c) => sum + c.load, 0);

  let carried = 0;
  let seatsAfter = seats;
  const guidance: CarGuidance[] = ordered.map((car, i) => {
    seatsAfter -= car.capacity;
    const remaining = Math.max(0, people - carried);
    const carsLeft = ordered.length - i;

    const mustTake = Math.max(0, remaining - seatsAfter);
    const share = remaining / carsLeft;
    const high = Math.min(car.capacity, Math.max(Math.ceil(share), mustTake));
    const low = Math.min(high, Math.max(mustTake, Math.floor(share)));

    carried += car.load;
    return {
      rideId: car.id,
      low,
      high,
      load: car.load,
      capacity: car.capacity,
      status: car.load < low ? "short" : car.load > high ? "over" : "ok",
    };
  });

  return {
    people,
    seats,
    withoutSeat: Math.max(0, people - seated),
    seatShortage: Math.max(0, people - seats),
    cars: guidance,
  };
}

const timeOf = (departure: string) => {
  const t = new Date(departure.replace(" ", "T")).getTime();
  return Number.isNaN(t) ? 0 : t;
};

/**
 * The plan for one direction of one day.
 *
 * `rides` are that day's rides in that direction, `participants` everyone signed
 * up for the day, and `canon` maps any name (or former name) to one form, so
 * someone on a ride under an old name is not counted twice.
 * Public transport and cars that left more than two hours ago are left out, along
 * with their passengers. Returns null when there is no car to give advice about.
 */
export function planDirection(
  rides: Ride[],
  participants: string[],
  canon: (name: string) => string,
): CarPlan | null {
  const active = rides.filter((r) => getRideStatus(r.departure_time).status !== "past");
  const cars = active.filter((r) => !r.is_public_transport);
  if (cars.length === 0) return null;

  const onPublicTransport = new Set(
    active.filter((r) => r.is_public_transport).flatMap((r) => r.passengers ?? []).map(canon),
  );
  const needSeat = new Set<string>();
  for (const name of participants) {
    const c = canon(name);
    if (!onPublicTransport.has(c)) needSeat.add(c);
  }
  // Anyone already in a car needs a seat, signed up for the day or not.
  for (const car of cars) for (const name of car.passengers ?? []) needSeat.add(canon(name));

  return planCarLoads(
    needSeat.size,
    cars.map((r) => ({
      id: r.id,
      capacity: r.total_seats,
      load: r.passengers?.length ?? 0,
      departsAt: timeOf(r.departure_time),
    })),
  );
}
