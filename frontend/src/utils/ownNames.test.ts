import { describe, expect, it } from "vitest";
import { findUser, isOwnName, ownNames } from "./people";
import { paidPerPerson, personalBalance } from "./finance";
import { computeAllActions } from "./actionItems";
import type { Expense, User } from "../types";

const user = (extra: Partial<User> & { name: string }): User => ({ ...({} as User), ...extra });
const members = [
  user({ id: "1", name: "Sam", discord_username: "samdraws", aliases: ["Sammie", "Alex"] }),
  user({ id: "2", name: "Alex", discord_username: "alexx", aliases: ["Lex"] }),
];
// The signed-in member as /users/me returns them: a copy, not the object in the list.
const me = { ...members[0] };

describe("ownNames", () => {
  it("is the current name, the Discord username and the former names", () => {
    expect(ownNames(me, members).slice(0, 3)).toEqual(["Sam", "samdraws", "Sammie"]);
  });

  it("leaves out a name another member goes by", () => {
    // Sam lists "Alex" as a former name, but Alex is another member's current name.
    expect(ownNames(me, members)).not.toContain("Alex");
  });

  it("always keeps the member's own current name", () => {
    const clash = [...members, user({ id: "3", name: "Robin", aliases: ["Sam"] })];
    expect(ownNames(me, clash)).toContain("Sam");
  });

  it("is empty while nobody is signed in, and works before the member list has loaded", () => {
    expect(ownNames(undefined, members)).toEqual([]);
    expect(ownNames(me)).toEqual(["Sam", "samdraws", "Sammie", "Alex"]);
  });
});

describe("isOwnName", () => {
  const mine = ownNames(me, members);
  it("owns a row under the old name, not someone else's", () => {
    expect(isOwnName(mine, "Sammie")).toBe(true);
    expect(isOwnName(mine, "samdraws")).toBe(true);
    expect(isOwnName(mine, "Alex")).toBe(false);
    expect(isOwnName(mine, "Lex")).toBe(false);
    expect(isOwnName(mine, undefined)).toBe(false);
    expect(isOwnName([], "Sam")).toBe(false);
  });
});

const expense = (id: string, paid_by: string, amount: number, shares: [string, number, string?][]): Expense =>
  ({
    id, paid_by, amount, description: id, date: "2026-10-01", currency: "EUR",
    shares: shares.map(([participant, amt, status], i) => ({ id: `${id}-${i}`, participant, amount: amt, status: status ?? "pending" })),
  }) as unknown as Expense;

describe("the money of a renamed member", () => {
  const expenses = [
    expense("old", "Sammie", 30, [["Sammie", 10, "confirmed"], ["Alex", 20]]), // paid before the rename
    expense("new", "Alex", 20, [["Sam", 10], ["Alex", 10, "confirmed"]]),
  ];

  it("counts what is owed under the old name too", () => {
    const mine = ownNames(me, members);
    expect(personalBalance(expenses, mine)).toEqual({ iOwe: 10, othersOweMe: 20 });
    // Under the current name alone the old expense went missing.
    expect(personalBalance(expenses, ["Sam"])).toEqual({ iOwe: 10, othersOweMe: 0 });
  });

  it("shows someone who paid under two names as one row", () => {
    expect(paidPerPerson(expenses, members)).toEqual([
      { name: "Sam", amount: 30 },
      { name: "Alex", amount: 20 },
    ]);
  });

  it("lets the payer confirm and the debtor pay under the old name", () => {
    const actions = computeAllActions({ rides: [], expenses, myNames: ownNames(me, members) });
    expect(actions.map((a) => a.kind)).toEqual(["payment_confirm", "payment_due"]);
  });
});

describe("findUser", () => {
  it("takes a member's current name over another member's former name", () => {
    // Sam lists "Alex" as a former name and comes first in the list; "Alex" is still Alex.
    expect(findUser(members, "Alex")?.id).toBe("2");
    expect(findUser(members, "Sammie")?.id).toBe("1");
    expect(findUser(members, "alexx")?.id).toBe("2");
    expect(findUser(members, "Nobody")).toBeUndefined();
  });
});
