import { computeRestaurantGaps } from "../components/hub/ComputeRestaurantGap";
import type { CalendarEvent, Ride, Meal, Expense, ExpenseShare, ActionAlert, RestaurantGap } from "../types";

// ── Tagged union — one type per action category ───────────────────────────────

export type AnyAction =
  | { kind: "event_gap";        alert:   ActionAlert;  }
  | { kind: "restaurant_gap";   gap:     RestaurantGap; }
  | { kind: "payment_due";      share:   ExpenseShare; expense: Expense }
  | { kind: "payment_confirm";  shares:  ExpenseShare[]; expense: Expense };

export type ActionKind = AnyAction["kind"];

// ── Filter groups shown in the ActiesPage tabs ────────────────────────────────
export const ACTION_FILTER_GROUPS: { id: ActionKind | "all"; label: string }[] = [
  { id: "all",            label: "Alles" },
  { id: "event_gap",      label: "Transport & Eten" },
  { id: "restaurant_gap", label: "Restaurant" },
  { id: "payment_due",    label: "Te betalen" },
  { id: "payment_confirm",label: "Te bevestigen" },
];

// ── Main compute function ─────────────────────────────────────────────────────

interface ComputeInput {
  events:   CalendarEvent[];
  rides:    Ride[];
  meals:    Meal[];
  expenses: Expense[];
  myName:   string | undefined;
}

export function computeAllActions({ events, rides, meals, expenses, myName }: ComputeInput): AnyAction[] {
  const items: AnyAction[] = [];

  // ── 1. Transport & food gaps (one item per event that has missing people) ──
  const inbound    = new Set(rides.filter(r => r.direction === "Inbound")  .flatMap(r => (r.passengers ?? []).map(p => p.toLowerCase())));
  const outbound   = new Set(rides.filter(r => r.direction === "Outbound") .flatMap(r => (r.passengers ?? []).map(p => p.toLowerCase())));
  const foodRsvps  = new Set(meals.flatMap(m => (m.participants ?? []).map(p => p.toLowerCase())));

  for (const ev of events) {
    const missing = (ev.participants ?? [])
      .map(name => {
        const lc   = name.toLowerCase();
        const gaps: string[] = [];
        if (!inbound.has(lc))                                    gaps.push("Heen");
        if (!outbound.has(lc))                                   gaps.push("Terug");
        if (meals.length > 0 && !foodRsvps.has(lc))             gaps.push("Eten");
        return { name, items: gaps };
      })
      .filter(m => m.items.length > 0);

    if (missing.length > 0) {
      items.push({ kind: "event_gap", alert: { date: ev.date, eventName: ev.event_name, missing } });
    }
  }

  // ── 2. Restaurant transport gaps ──────────────────────────────────────────
  for (const gap of computeRestaurantGaps(rides)) {
    items.push({ kind: "restaurant_gap", gap });
  }

  // ── 3. Payment actions (personal — only when myName is known) ─────────────
  if (myName) {
    for (const expense of expenses) {
      // Participant: I still need to pay (one action per expense I owe)
      for (const share of expense.shares) {
        if (share.participant === myName && share.status === "pending") {
          items.push({ kind: "payment_due", share, expense });
        }
      }

      // Payer: grouped — one action per expense with any outstanding shares
      if (expense.paid_by === myName) {
        const outstanding = expense.shares.filter(
          s => s.participant !== myName && (s.status === "pending" || s.status === "claimed"),
        );
        if (outstanding.length > 0) {
          items.push({ kind: "payment_confirm", shares: outstanding, expense });
        }
      }
    }
  }

  return items;
}

// ── Count helpers for the HubPage banner ─────────────────────────────────────

export function actionTotalCount(actions: AnyAction[]): number {
  return actions.reduce((sum, a) => {
    if (a.kind === "event_gap")      return sum + a.alert.missing.length;
    if (a.kind === "restaurant_gap") return sum + a.gap.unassigned.length;
    if (a.kind === "payment_confirm") return sum + a.shares.length;
    return sum + 1; // payment_due = 1 each
  }, 0);
}

export function actionCountByKind(actions: AnyAction[]): Partial<Record<ActionKind, number>> {
  const counts: Partial<Record<ActionKind, number>> = {};
  for (const a of actions) {
    const n = a.kind === "event_gap"
      ? a.alert.missing.length
      : a.kind === "restaurant_gap"
      ? a.gap.unassigned.length
      : a.kind === "payment_confirm"
      ? a.shares.length
      : 1;
    counts[a.kind] = (counts[a.kind] ?? 0) + n;
  }
  return counts;
}
