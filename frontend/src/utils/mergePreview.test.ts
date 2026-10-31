import { describe, expect, it } from "vitest";
import { droppedParts, movedParts } from "./mergePreview";

describe("movedParts", () => {
  it("counts each kind in the right number, in a fixed order, and leaves out what is zero", () => {
    const counts = { meals: 2, rides: 1, expenses: 1, settlements: 0, photos: 12, stories_seen: 4, push_subscriptions: 1 };
    expect(movedParts({ counts })).toEqual(["1 rit", "2 activiteiten", "1 uitgave", "12 foto's of video's"]);
  });

  it("is empty when the placeholder is not on anything", () => {
    expect(movedParts({ counts: { rides: 0 } })).toEqual([]);
  });
});

describe("droppedParts", () => {
  it("names what is left out", () => {
    expect(droppedParts({ dropped: { settlements: 1, ride_costs: 0, parking_spots: 2 } })).toEqual([
      "1 afrekening tussen hen beiden",
      "2 parkeerplekken die het lid al heeft",
    ]);
  });
});
