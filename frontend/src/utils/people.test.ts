import { describe, expect, it } from "vitest";
import { groupPeople, isIn } from "./people";
import type { User } from "../types";

const user = (extra: Partial<User> & { name: string }): User => ({ ...({} as User), ...extra });
const members = [
  user({ id: "1", name: "Marshmallow", discord_username: "marshxmallow.fluff", aliases: ["Marsh"] }),
  user({ id: "2", name: "Sam", discord_username: "sam#1", aliases: ["samdraws"] }),
  user({ id: "3", name: "Alex", discord_username: "alex", aliases: ["Sam"] }), // claims "Sam", which is another member's name
];

describe("groupPeople", () => {
  it("makes one person of a member who is on the list under two of their names", () => {
    const people = groupPeople(["marshxmallow.fluff", "Sam", "Marshmallow"], members);
    expect(people.map((p) => p.name)).toEqual(["Marshmallow", "Sam"]);
    expect(people[0].names).toEqual(["marshxmallow.fluff", "Marshmallow"]);
  });

  it("shows the member's current name, however they were signed up", () => {
    expect(groupPeople(["Marsh"], members)[0].name).toBe("Marshmallow");
    expect(groupPeople(["samdraws"], members)[0].name).toBe("Sam");
  });

  it("keeps the order people first appear in", () => {
    expect(groupPeople(["Sam", "Marshmallow", "samdraws"], members).map((p) => p.name)).toEqual(["Sam", "Marshmallow"]);
  });

  it("takes a name that is no member as a guest of its own, ignoring case", () => {
    const people = groupPeople(["Guest", "guest", "Other"], members);
    expect(people.map((p) => p.name)).toEqual(["Guest", "Other"]);
    expect(people[0].user).toBeUndefined();
  });

  it("keeps a member's current name as theirs, even when another member lists it as a former name", () => {
    // Alex lists "Sam" as a former name, yet someone on a list as "samdraws" is Sam, who is also "Sam".
    const [sam] = groupPeople(["samdraws"], members);
    expect(isIn(sam, new Set(["sam"]))).toBe(true);
  });

  it("does not merge two different members, nor give one the other's name", () => {
    const people = groupPeople(["Sam", "Alex"], members);
    expect(people.map((p) => p.name)).toEqual(["Sam", "Alex"]);
    // "Sam" is Alex's former name too, but it is Sam's current one: it is Sam's alone.
    expect(isIn(people[1], new Set(["sam"]))).toBe(false);
    expect(isIn(people[0], new Set(["sam"]))).toBe(true);
  });

  it("recognises a member under any name they go by elsewhere", () => {
    const [marsh] = groupPeople(["Marshmallow"], members);
    for (const n of ["marshmallow", "marshxmallow.fluff", "marsh"]) expect(isIn(marsh, new Set([n]))).toBe(true);
    expect(isIn(marsh, new Set(["sam"]))).toBe(false);
  });

  it("works with no member list: every name is a person", () => {
    expect(groupPeople(["A", "B", "a"], []).map((p) => p.name)).toEqual(["A", "B"]);
  });
});
