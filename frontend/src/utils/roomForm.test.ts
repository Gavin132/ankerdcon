import { describe, expect, it } from "vitest";
import { roomCreatePayload, roomEditPayload } from "./roomForm";

const empty = { room_number: " ", floor: "", instructions: "", capacity: "", occupants: ["Sam"] };

describe("room form payloads", () => {
  it("sends emptied fields as null when editing, so they are really cleared", () => {
    expect(roomEditPayload(empty)).toEqual({ room_number: null, floor: null, instructions: null, capacity: null, occupants: ["Sam"] });
  });

  it("leaves empty fields out for a new room", () => {
    const p = roomCreatePayload(empty);
    expect(p.room_number).toBeUndefined();
    expect(p.capacity).toBeUndefined();
  });

  it("trims text and reads the capacity as a number", () => {
    expect(roomEditPayload({ ...empty, room_number: " 214 ", capacity: "3" })).toMatchObject({ room_number: "214", capacity: 3 });
    expect(roomCreatePayload({ ...empty, room_number: " 214 ", capacity: "3" })).toMatchObject({ room_number: "214", capacity: 3 });
  });
});
