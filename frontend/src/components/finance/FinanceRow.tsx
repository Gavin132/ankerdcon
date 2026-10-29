import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { formatAmount } from "../../utils/format";

export type FinanceTone = "owe" | "owed" | "neutral";
export type FinancePillTone = "ok" | "warn" | "bad" | "neutral";

const AMOUNT_TONE: Record<FinanceTone, string> = {
  owe: "text-bad",
  owed: "text-ok",
  neutral: "text-ink",
};

interface FinanceRowProps {
  /** An avatar, or an icon square when the row is about no single person. */
  lead: ReactNode;
  title: string;
  sub?: string;
  amount?: number | null;
  currency?: string;
  /** Which way the money goes: red when you pay, green when you receive. This is the direction, so it needs no pill. */
  tone?: FinanceTone;
  /** Only where the member has to act or wait ("Te betalen", "Bevestigen", "Wacht op bevestiging", "Invullen"). */
  pill?: { text: string; tone: FinancePillTone };
  /** A row that opens something is a button with a chevron; without it the row is plain text. */
  onClick?: () => void;
  muted?: boolean;
}

/** One line of money on the Financiën page (Afrekenen, Ritkosten): who or what, how much, and a pill only if you must act. */
export function FinanceRow({ lead, title, sub, amount, currency = "EUR", tone = "neutral", pill, onClick, muted }: FinanceRowProps) {
  const body = (
    <>
      {lead}
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 break-words text-[13.5px] font-semibold text-ink">{title}</span>
        {sub && <span className="block truncate text-xs text-ink-3">{sub}</span>}
        {pill && <span className={`pill pill-${pill.tone} mt-1 inline-block`}>{pill.text}</span>}
      </span>
      {amount != null && (
        <span className={`shrink-0 font-mono text-sm font-semibold tabular-nums ${AMOUNT_TONE[tone]}`}>{formatAmount(amount, currency)}</span>
      )}
      {onClick && <ChevronRight size={16} className="shrink-0 text-ink-3" />}
    </>
  );
  const cls = `flex w-full items-center gap-3 px-4 py-3 text-left ${muted ? "opacity-60" : ""}`;
  return (
    <li>
      {onClick ? (
        <button type="button" onClick={onClick} className={`${cls} transition-colors hover:bg-sunken`}>
          {body}
        </button>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </li>
  );
}
