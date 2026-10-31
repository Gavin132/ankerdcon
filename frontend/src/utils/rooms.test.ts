import { describe, expect, it } from "vitest";
import { duplicateNotice, moveHint, otherRoomsOf, peopleInOtherRooms, peopleInSeveralRooms, roomLabel, roomMoveMessage } from "./rooms";
import type { HotelRoom, User } from "../types";

const user = (extra: Partial<User> & { name: string }): User => ({ ...({} as User), ...extra });
const members = [
  user({ id: "1", name: "Sam", discord_username: "samdraws", aliases: ["Sammie"] }),
  user({ id: "2", name: "Alex", discord_username: "alexx", aliases: [] }),
  user({ id: "3", name: "Robin", aliases: ["Sam"] }), // claims "Sam", which is another member's current name
];

const room = (id: string, room_number: string | null, occupants: string[]) =>
  ({ id, event_id: "t", room_number, capacity: 4, occupants }) as HotelRoom;

describe("peopleInSeveralRooms", () => {
  it("finds nobody when every person is in one room", () => {
    expect(peopleInSeveralRooms([room("a", "1", ["Sam"]), room("b", "2", ["Alex"])], members)).toEqual([]);
  });

  it("finds someone with the same name in two rooms", () => {
    const found = peopleInSeveralRooms([room("a", "1", ["Sam", "Alex"]), room("b", "2", ["Sam"])], members);
    expect(found.map((d) => d.person.name)).toEqual(["Sam"]);
    expect(found[0].rooms.map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("finds someone who is in one room by their Discord username and in another by their name or a former name", () => {
    const rooms = [room("a", "1", ["samdraws"]), room("b", "2", ["Sam"]), room("c", "3", ["Sammie"])];
    const found = peopleInSeveralRooms(rooms, members);
    expect(found).toHaveLength(1);
    expect(found[0].person.name).toBe("Sam");
    expect(found[0].rooms.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("does not count someone on one room under two names as being in two rooms", () => {
    expect(peopleInSeveralRooms([room("a", "1", ["Sam", "samdraws"]), room("b", "2", ["Alex"])], members)).toEqual([]);
  });

  it("does not take two members for one because one lists the other's name as a former name", () => {
    expect(peopleInSeveralRooms([room("a", "1", ["Sam"]), room("b", "2", ["Robin"])], members)).toEqual([]);
  });

  it("finds a guest who is no member by name, ignoring case", () => {
    const found = peopleInSeveralRooms([room("a", "1", ["Gast"]), room("b", "2", ["gast"])], members);
    expect(found.map((d) => d.person.name)).toEqual(["Gast"]);
  });
});

describe("otherRoomsOf", () => {
  it("lists the rooms a person is also in, never the room itself", () => {
    const rooms = [room("a", "1", ["Sam"]), room("b", "2", ["samdraws"])];
    const dups = peopleInSeveralRooms(rooms, members);
    expect(otherRoomsOf(dups[0].person, rooms[0], dups).map((r) => r.id)).toEqual(["b"]);
  });
});

describe("peopleInOtherRooms and moveHint", () => {
  const rooms = [room("a", "12", ["Sam"]), room("b", null, ["Alex"]), room("c", "7", [])];

  it("finds who picked for a room already sleeps elsewhere, under any of their names", () => {
    const found = peopleInOtherRooms(["samdraws", "Alex", "Robin"], rooms, members, "c");
    expect(found.map((p) => [p.name, p.rooms.map((r) => r.id)])).toEqual([["Sam", ["a"]], ["Alex", ["b"]]]);
  });

  it("does not count the room being edited, and counts every room for a new one", () => {
    expect(peopleInOtherRooms(["Sam"], rooms, members, "a")).toEqual([]);
    expect(peopleInOtherRooms(["Sam"], rooms, members, null)).toHaveLength(1);
  });

  it("says who will be moved", () => {
    expect(moveHint([])).toBe("");
    expect(moveHint(peopleInOtherRooms(["Sam"], rooms, members, "c"))).toBe("Sam slaapt nu in kamer 12 en wordt naar deze kamer verplaatst.");
    expect(moveHint(peopleInOtherRooms(["Sam", "Alex"], rooms, members, "c"))).toBe(
      "Sam (kamer 12) en Alex (een kamer zonder nummer) slapen nu in een andere kamer en worden naar deze kamer verplaatst.",
    );
  });
});

describe("duplicateNotice", () => {
  const dup = (name: string, count: number) => ({ person: { name } as never, rooms: Array.from({ length: count }, (_, i) => room(`r${i}`, null, [])) });

  it("says nothing when nobody is twice", () => {
    expect(duplicateNotice([])).toBe("");
  });
  it("names one person and the number of rooms", () => {
    expect(duplicateNotice([dup("Sam", 2)])).toBe("Sam staat in 2 kamers");
  });
  it("joins several people, in plural", () => {
    expect(duplicateNotice([dup("Sam", 2), dup("Alex", 3)])).toBe("Sam (2 kamers) en Alex (3 kamers) staan in meer dan één kamer");
  });
});

describe("roomMoveMessage", () => {
  const move = (name: string, room_id: string, room_number: string | null) => ({ name, room_id, room_number });

  it("says nothing when nobody moved", () => {
    expect(roomMoveMessage([], "4")).toBe("");
  });
  it("says who moved from which room to which", () => {
    expect(roomMoveMessage([move("Sam", "a", "12")], "4")).toBe("Sam is verplaatst van kamer 12 naar kamer 4.");
  });
  it("groups people who left the same room, and names a room without a number", () => {
    expect(roomMoveMessage([move("Sam", "a", null), move("Alex", "a", null)], null)).toBe(
      "Sam en Alex zijn verplaatst van een kamer zonder nummer naar een kamer zonder nummer.",
    );
  });
  it("gives one sentence per room they left", () => {
    expect(roomMoveMessage([move("Sam", "a", "12"), move("Alex", "b", "7")], "4")).toBe(
      "Sam is verplaatst van kamer 12 naar kamer 4. Alex is verplaatst van kamer 7 naar kamer 4.",
    );
  });
  it("names a person once when they left two rooms", () => {
    expect(roomMoveMessage([move("Sam", "a", "12"), move("Sam", "b", "7")], "4")).toBe(
      "Sam is verplaatst van kamer 12 naar kamer 4. Sam is verplaatst van kamer 7 naar kamer 4.",
    );
  });
});

describe("roomLabel", () => {
  it("is the number, or a room without one", () => {
    expect(roomLabel({ room_number: "214" })).toBe("kamer 214");
    expect(roomLabel({ room_number: null })).toBe("een kamer zonder nummer");
  });
});
