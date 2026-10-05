import { describe, expect, it } from "vitest";
import { matchSearchActions, type ActionContext } from "./searchActions";

const ctx: ActionContext = { hasTrip: true, tripOver: false, hasHotel: true, hasCon: true };
const ids = (q: string, c: Partial<ActionContext> = {}) => matchSearchActions(q, { ...ctx, ...c }).map((a) => a.id);

describe("matchSearchActions", () => {
  it("finds an action by its label, partial words included", () => {
    expect(ids("locatie pingen")).toEqual(["ping"]);
    expect(ids("loc pi")).toEqual(["ping"]);
    expect(ids("rit aan")).toContain("ride");
  });

  it("finds an action by an alias", () => {
    expect(ids("ping")).toEqual(["ping"]);
    expect(ids("lift")).toEqual(["ride"]);
    expect(ids("diner")).toEqual(["meal"]);
    expect(ids("geparkeerd")).toEqual(["parking"]);
    expect(ids("tikkie")).toEqual(["finance"]);
  });

  it("ignores case, accents and punctuation", () => {
    expect(ids("FOTO'S")).toContain("photos");
    expect(ids("Parkeerplek  Opslaan")).toEqual(["parking"]);
  });

  it("puts a label match before an alias match", () => {
    expect(ids("rit")[0]).toBe("ride");
  });

  it("returns nothing for an empty or unknown query", () => {
    expect(ids("")).toEqual([]);
    expect(ids("   ")).toEqual([]);
    expect(ids("zzzzz")).toEqual([]);
  });

  it("hides trip actions when there is no trip, and keeps the rest", () => {
    expect(ids("rit", { hasTrip: false })).toEqual([]);
    expect(ids("ping", { hasTrip: false })).toEqual(["ping"]);
    expect(ids("geld", { hasTrip: false })).toEqual(["finance"]);
  });

  it("does not offer a ride or meal for a trip that is over", () => {
    expect(ids("rit", { tripOver: true })).toEqual([]);
    expect(ids("eten", { tripOver: true })).toEqual([]);
    expect(ids("foto", { tripOver: true })).toEqual(["photos"]);
  });

  it("only offers hotel rooms and cosplay where the trip has them", () => {
    expect(ids("kamer", { hasHotel: false })).toEqual([]);
    expect(ids("cosplay", { hasCon: false })).toEqual([]);
  });
});
