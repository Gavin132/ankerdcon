import { describe, expect, it } from "vitest";
import { buildTrip, tripGaps, tripOutliers, tripPeople, tripRoomGaps } from "./trips";
import type { CalendarEvent, HotelRoom, Meal, Ride, User } from "../types";

const members = [
  { id: "1", name: "Marshmallow", discord_username: "marshxmallow.fluff", aliases: [] },
  { id: "2", name: "Sam", discord_username: "sam", aliases: ["samdraws"] },
] as unknown as User[];

const day = (id: string, date: string, participants: string[]) =>
  ({ id, event_name: "HDCC 2026", date, multi_day_id: "trip", participants, has_con: true, is_hotel: true }) as unknown as CalendarEvent;

// The reported case: on Saturday as the Discord username, on Sunday as the member's name.
const trip = buildTrip(
  [day("d1", "2026-11-21", ["marshxmallow.fluff", "Sam"]), day("d2", "2026-11-22", ["Marshmallow", "Sam"])],
  "trip",
)!;

describe("a member signed up under two names", () => {
  it("is one person on the trip", () => {
    expect(trip.participants).toHaveLength(3); // the raw list has her twice
    expect(tripPeople(trip, members).map((p) => p.name)).toEqual(["Marshmallow", "Sam"]);
  });

  it("is there both days, not an outlier with one day each", () => {
    expect(tripOutliers(trip, members)).toEqual([]);
    // Without the members the two names cannot be joined, which is how it looked.
    expect(tripOutliers(trip).map((o) => o.name)).toEqual(["marshxmallow.fluff", "Marshmallow"]);
  });

  it("is still a real outlier when she is only there one day", () => {
    const partial = buildTrip([day("d1", "2026-11-21", ["marshxmallow.fluff", "Sam"]), day("d2", "2026-11-22", ["Sam"])], "trip")!;
    const out = tripOutliers(partial, members);
    expect(out.map((o) => [o.name, o.kind])).toEqual([["Marshmallow", "leaves-early"]]);
  });

  it("has a ride when the ride lists her under either name", () => {
    const rides = [
      { id: "r1", direction: "Inbound", driver: "Sam", passengers: ["marshxmallow.fluff"], linked_event_id: "d1" },
      { id: "r2", direction: "Outbound", driver: "Sam", passengers: ["Marshmallow"], linked_event_id: "d2" },
    ] as unknown as Ride[];
    expect(tripGaps(trip, rides, [], members).transport).toEqual([]);
    expect(tripGaps(trip, [], [], members).transport.map((g) => g.name)).toEqual(["Marshmallow", "Sam"]);
  });

  it("is eating when a meal lists her under either name", () => {
    const meals = [{ id: "m1", linked_event_id: "d1", participants: ["marshxmallow.fluff", "Sam"], category: null }] as unknown as Meal[];
    expect(tripGaps(trip, [], meals, members).food).toEqual([]);
  });

  it("has a hotel room when the room lists her under either name", () => {
    const rooms = [{ id: "k1", occupants: ["marshxmallow.fluff"], capacity: 2 }] as unknown as HotelRoom[];
    expect(tripRoomGaps(trip, rooms, members)).toEqual(["Sam"]);
    expect(tripRoomGaps(trip, [], members)).toEqual(["Marshmallow", "Sam"]);
  });
});
