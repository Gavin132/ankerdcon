import { groupPeople, isOwnName } from "./people";
import type { Expense, User } from "../types";

/**
 * What the signed-in member owes and is owed on the open (not yet confirmed) shares. An expense or share carries the
 * name it was made under, so "mine" is any of the member's own names (`myNames`), not just the current one.
 */
export function personalBalance(expenses: Expense[], myNames: string[]): { iOwe: number; othersOweMe: number } {
  let iOwe = 0;
  let othersOweMe = 0;
  for (const exp of expenses) {
    for (const share of exp.shares) {
      if (share.status === "confirmed") continue;
      if (isOwnName(myNames, share.participant)) iOwe += share.amount;
      else if (isOwnName(myNames, exp.paid_by)) othersOweMe += share.amount;
    }
  }
  return { iOwe, othersOweMe };
}

/** What each person paid, biggest first. Someone who paid under two names (a rename, a Discord username) is one row. */
export function paidPerPerson(expenses: Expense[], users: User[]): { name: string; amount: number }[] {
  const people = groupPeople(expenses.map((e) => e.paid_by), users);
  const personOf = new Map(people.flatMap((p) => p.names.map((n) => [n, p] as const)));
  const totals = new Map<string, number>();
  for (const exp of expenses) {
    const name = personOf.get(exp.paid_by)?.name ?? exp.paid_by;
    totals.set(name, (totals.get(name) ?? 0) + exp.amount);
  }
  return [...totals.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
}
