import { describe, expect, it } from "vitest";
import { buildTrip, tripRoomSummary } from "./trips";
import type { CalendarEvent, HotelRoom, User } from "../types";

const members = [
  { id: "1", name: "Marshmallow", discord_username: "marshxmallow.fluff", aliases: [] },
  { id: "2", name: "Sam", discord_username: "sam", aliases: [] },
] as unknown as User[];

const day = (id: string, date: string, participants: string[]) =>
  ({ id, event_name: "DoKomi 2027", date, multi_day_id: "trip", participants, has_con: true, is_hotel: true }) as unknown as CalendarEvent;

const room = (id: string, capacity: number | null, occupants: string[] = []) =>
  ({ id, event_id: "d1", room_number: null, capacity, occupants }) as unknown as HotelRoom;

// Marshmallow is on Friday as her Discord username and on Saturday under her name: one person, two stored names.
const trip = buildTrip([day("d1", "2027-07-09", ["marshxmallow.fluff", "Sam"]), day("d2", "2027-07-10", ["Marshmallow", "Sam"])], "trip")!;

describe("tripRoomSummary", () => {
  it("counts people, not the names they are signed up under", () => {
    expect(trip.participants).toHaveLength(3);
    expect(tripRoomSummary(trip, [], members).people).toBe(2);
  });

  it("has nobody assigned when the rooms are made but still empty, and adds up their beds", () => {
    const rooms = Array.from({ length: 12 }, (_, i) => room(`r${i}`, 2));
    expect(tripRoomSummary(trip, rooms, members)).toEqual({ rooms: 12, seats: 24, people: 2, assigned: 0 });
  });

  it("counts a person in a room once, under whichever of their names the room has", () => {
    const rooms = [room("a", 2, ["marshxmallow.fluff", "Sam"]), room("b", 2)];
    expect(tripRoomSummary(trip, rooms, members)).toMatchObject({ assigned: 2, people: 2 });
  });

  it("does not know the beds when a room has no capacity", () => {
    expect(tripRoomSummary(trip, [room("a", 2), room("b", null)], members).seats).toBeNull();
  });
});
