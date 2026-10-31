import { motion } from "framer-motion";
import { HandCoins } from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { FinanceRow, type FinancePillTone, type FinanceTone } from "./FinanceRow";
import { formatAmount, formatDate } from "../../utils/format";
import type { Settlement, SettleUpItem, SettleUpOverview, User } from "../../types";

export type SettleTarget =
  | { kind: "item"; item: SettleUpItem }
  | { kind: "settlement"; settlement: Settlement };

interface Props {
  overview: SettleUpOverview | undefined;
  users: User[];
  meId: string | undefined;
  onOpen: (target: SettleTarget) => void;
  /** Layout classes from the page (its order on a phone). */
  className?: string;
}

/** What a settlement row says, from the current member's side. */
export function describeSettlement(s: Settlement, meId: string | undefined) {
  const iPay = s.from_user_id === meId;
  const other = iPay ? s.to_user : s.from_user;
  const otherId = iPay ? s.to_user_id : s.from_user_id;
  // `tone` is the direction of the money (red when you pay, green when you receive); `pillTone` is what the
  // member has to do about it.
  const tone: FinanceTone = iPay ? "owe" : "owed";
  if (s.status === "confirmed") return { other, otherId, title: iPay ? `Betaald aan ${other}` : `Ontvangen van ${other}`, pill: "Verrekend", pillTone: "neutral" as FinancePillTone, tone: "neutral" as FinanceTone };
  if (s.status === "requested") {
    return iPay
      ? { other, otherId, title: `${other} vraagt geld`, pill: "Te betalen", pillTone: "bad" as FinancePillTone, tone }
      : { other, otherId, title: `Verzoek aan ${other}`, pill: "Wacht op betaling", pillTone: "warn" as FinancePillTone, tone };
  }
  return iPay
    ? { other, otherId, title: `Betaald aan ${other}`, pill: "Wacht op bevestiging", pillTone: "warn" as FinancePillTone, tone }
    : { other, otherId, title: `${other} heeft betaald`, pill: "Bevestigen", pillTone: "ok" as FinancePillTone, tone };
}

function resolveUser(id: string, users: User[]) {
  return users.find((u) => u.id === id);
}

/**
 * Afrekenen: one line per member you still owe or who owes you, netted over
 * every expense, plus the settlements under way. Hidden when nothing's open.
 */
export function SettleUpCard({ overview, users, meId, onOpen, className = "" }: Props) {
  if (!overview) return null;
  const open = overview.settlements.filter((s) => s.status !== "confirmed");
  const done = overview.settlements.filter((s) => s.status === "confirmed").slice(0, 3);
  if (open.length === 0 && overview.items.length === 0 && done.length === 0) return null;

  return (
    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`card-surface overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 px-4 pb-1 pt-4">
        <HandCoins size={14} className="shrink-0 text-ink-3" />
        <p className="section-label">Afrekenen</p>
      </div>
      <p className="px-4 pb-2 text-[12px] text-ink-3">Eén betaling per persoon, voor alle uitgaven samen.</p>

      {(open.length > 0 || overview.items.length > 0) && (
        <ul className="divide-y divide-line border-t border-line">
          {open.map((s) => {
            const d = describeSettlement(s, meId);
            return (
              <FinanceRow
                key={s.id}
                lead={<UserAvatar name={d.other} user={resolveUser(d.otherId, users)} className="h-8 w-8 shrink-0 text-[12px]" />}
                title={d.title}
                sub={s.created_at ? `Sinds ${formatDate(s.created_at)}` : "Afrekening"}
                amount={s.amount}
                currency={s.currency}
                tone={d.tone}
                pill={{ text: d.pill, tone: d.pillTone }}
                onClick={() => onOpen({ kind: "settlement", settlement: s })}
              />
            );
          })}
          {overview.items.map((item) => {
            const n = item.share_count;
            const sub = item.blocked_by_settlement
              ? "Nieuw sinds de lopende afrekening"
              : `${n} ${n === 1 ? "aandeel" : "aandelen"}`;
            // An open amount says which way it goes by its colour; only "quitte" is something to do (strike it off).
            const [title, tone]: [string, FinanceTone] =
              item.direction === "i_owe"   ? [`Jij betaalt ${item.counterparty}`, "owe"] :
              item.direction === "owes_me" ? [`${item.counterparty} betaalt jou`, "owed"] :
                                             [`Quitte met ${item.counterparty}`, "neutral"];
            return (
              <FinanceRow
                key={`${item.counterparty_id}-${item.currency}`}
                lead={<UserAvatar name={item.counterparty} user={resolveUser(item.counterparty_id, users)} className="h-8 w-8 shrink-0 text-[12px]" />}
                title={title}
                sub={sub}
                amount={item.amount}
                currency={item.currency}
                tone={tone}
                pill={item.direction === "even" ? { text: "Wegstrepen", tone: "neutral" } : undefined}
                muted={item.blocked_by_settlement}
                onClick={() => onOpen({ kind: "item", item })}
              />
            );
          })}
        </ul>
      )}

      {done.length > 0 && (
        <div className="border-t border-line px-4 pb-3 pt-2.5">
          <p className="mb-1 text-[12px] font-semibold text-ink-3">Recent verrekend</p>
          <ul>
            {done.map((s) => {
              const d = describeSettlement(s, meId);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onOpen({ kind: "settlement", settlement: s })}
                    className="flex min-h-11 w-full items-center justify-between gap-2 py-2.5 text-left text-[12px] text-ink-2 hover:text-ink"
                  >
                    <span className="truncate">{d.title}{s.confirmed_at ? ` · ${formatDate(s.confirmed_at)}` : ""}</span>
                    <span className="shrink-0 font-mono tabular-nums">{formatAmount(s.amount, s.currency)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </motion.section>
  );
}
