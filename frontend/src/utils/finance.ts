import { formatCurrency } from "./format";
import type { Payment } from "../types";

export interface Debt {
  from: string;
  to: string;
  amount: number;
}

export function computeDebts(payments: Payment[]): Debt[] {
  const net: Record<string, Record<string, number>> = {};

  for (const p of payments) {
    if (!p.splits || p.splits.length === 0) continue;
    for (const split of p.splits) {
      if (split.name === p.paid_by) continue;
      if (!net[split.name]) net[split.name] = {};
      net[split.name][p.paid_by] = (net[split.name][p.paid_by] ?? 0) + split.amount;
    }
  }

  const result: Debt[] = [];
  const seen = new Set<string>();

  for (const [debtor, creditors] of Object.entries(net)) {
    for (const [creditor, amount] of Object.entries(creditors)) {
      const key = [debtor, creditor].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);

      const reverse = net[creditor]?.[debtor] ?? 0;
      const netAmt = amount - reverse;
      if (netAmt > 0.005) result.push({ from: debtor, to: creditor, amount: netAmt });
      else if (netAmt < -0.005) result.push({ from: creditor, to: debtor, amount: -netAmt });
    }
  }

  return result.sort((a, b) => b.amount - a.amount);
}

export function whatsappText(debt: Debt): string {
  return `Hé ${debt.from}! Je bent nog ${formatCurrency(debt.amount)} verschuldigd aan ${debt.to}. Kun je dit zo snel mogelijk overmaken? 💸`;
}
