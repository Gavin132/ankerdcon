import { computeRestaurantGaps } from "../components/hub/ComputeRestaurantGap";
import { isOwnName } from "./people";
import type { Ride, Meal, Expense, ExpenseShare, RestaurantGap, User } from "../types";

// Missing transport / food per trip lives in utils/trips.ts (`tripGaps`), so
// the Hub's "Voor jou" panel and the Event tab's counts always agree. This
// file covers the actions that aren't tied to one trip's sign-ups.

// ── Tagged union — one type per action category ───────────────────────────────

export type AnyAction =
  | { kind: "restaurant_gap";   gap:     RestaurantGap; }
  | { kind: "payment_due";      share:   ExpenseShare; expense: Expense }
  | { kind: "payment_confirm";  shares:  ExpenseShare[]; expense: Expense };

export type ActionKind = AnyAction["kind"];

// ── Main compute function ─────────────────────────────────────────────────────

interface ComputeInput {
  rides:    Ride[];
  meals?:   Meal[];
  /** The members, to tell which stored names are one person. */
  users?:   User[];
  expenses: Expense[];
  /** Every name the signed-in member is stored under (`useMyNames`); empty while unknown. */
  myNames:  string[];
}

export function computeAllActions({ rides, meals, users, expenses, myNames }: ComputeInput): AnyAction[] {
  const items: AnyAction[] = [];

  // ── 1. Restaurant transport gaps ──────────────────────────────────────────
  for (const gap of computeRestaurantGaps(rides, meals, users)) {
    items.push({ kind: "restaurant_gap", gap });
  }

  // ── 2. Payment actions (personal — only when the member is known) ─────────────
  if (myNames.length > 0) {
    for (const expense of expenses) {
      // Participant: I still need to pay (one action per expense I owe)
      for (const share of expense.shares) {
        if (isOwnName(myNames, share.participant) && share.status === "pending" && !share.settlement_id) {
          items.push({ kind: "payment_due", share, expense });
        }
      }

      // Payer: grouped — one action per expense with any outstanding shares
      if (isOwnName(myNames, expense.paid_by)) {
        const outstanding = expense.shares.filter(
          s => !isOwnName(myNames, s.participant) && !s.settlement_id && (s.status === "pending" || s.status === "claimed"),
        );
        if (outstanding.length > 0) {
          items.push({ kind: "payment_confirm", shares: outstanding, expense });
        }
      }
    }
  }

  return items;
}
