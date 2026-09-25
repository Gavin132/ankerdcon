import { motion } from "framer-motion";
import { HandCoins, ChevronRight } from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
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
}

const PILL = "shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold";
const TONE = {
  owe:     "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  owed:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  waiting: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  muted:   "bg-sunken text-ink-2",
} as const;

/** What a settlement row says, from the current member's side. */
export function describeSettlement(s: Settlement, meId: string | undefined) {
  const iPay = s.from_user_id === meId;
  const other = iPay ? s.to_user : s.from_user;
  const otherId = iPay ? s.to_user_id : s.from_user_id;
  if (s.status === "confirmed") return { other, otherId, title: iPay ? `Betaald aan ${other}` : `Ontvangen van ${other}`, pill: "Afgerond", tone: TONE.muted };
  if (s.status === "requested") {
    return iPay
      ? { other, otherId, title: `${other} vraagt geld`, pill: "Betalen", tone: TONE.owe }
      : { other, otherId, title: `Verzoek aan ${other}`, pill: "Wacht op betaling", tone: TONE.waiting };
  }
  return iPay
    ? { other, otherId, title: `Betaald aan ${other}`, pill: "Wacht op bevestiging", tone: TONE.waiting }
    : { other, otherId, title: `${other} heeft betaald`, pill: "Bevestigen", tone: TONE.owed };
}

function resolveUser(id: string, users: User[]) {
  return users.find((u) => u.id === id);
}

function Row({ user, name, title, sub, amount, currency, pill, tone, onClick, muted }: {
  user?: User; name: string; title: string; sub: string; amount: number; currency: string;
  pill: string; tone: string; onClick: () => void; muted?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-sunken ${muted ? "opacity-60" : ""}`}
      >
        <UserAvatar name={name} user={user} className="h-8 w-8 shrink-0 text-[11px]" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-semibold text-ink">{title}</span>
          <span className="block truncate text-[11.5px] text-ink-3">{sub}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className="font-mono text-[14px] font-semibold tabular-nums text-ink">{formatAmount(amount, currency)}</span>
          <span className={`${PILL} ${tone}`}>{pill}</span>
        </span>
        <ChevronRight size={14} className="shrink-0 text-ink-3" />
      </button>
    </li>
  );
}

/**
 * Afrekenen: one line per member you still owe or who owes you, netted over
 * every expense, plus the settlements under way. Hidden when nothing's open.
 */
export function SettleUpCard({ overview, users, meId, onOpen }: Props) {
  if (!overview) return null;
  const open = overview.settlements.filter((s) => s.status !== "confirmed");
  const done = overview.settlements.filter((s) => s.status === "confirmed").slice(0, 3);
  if (open.length === 0 && overview.items.length === 0 && done.length === 0) return null;

  return (
    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-surface overflow-hidden">
      <div className="flex items-center gap-2 px-4 pb-1 pt-4">
        <HandCoins size={13} className="shrink-0 text-ink-3" />
        <p className="section-label">Afrekenen</p>
      </div>
      <p className="px-4 pb-2 text-[12px] text-ink-3">Eén betaling per persoon, voor alle uitgaven samen.</p>

      {(open.length > 0 || overview.items.length > 0) && (
        <ul className="divide-y divide-line border-t border-line">
          {open.map((s) => {
            const d = describeSettlement(s, meId);
            return (
              <Row
                key={s.id}
                user={resolveUser(d.otherId, users)}
                name={d.other}
                title={d.title}
                sub={`Kenmerk ${s.payment_ref}`}
                amount={s.amount}
                currency={s.currency}
                pill={d.pill}
                tone={d.tone}
                onClick={() => onOpen({ kind: "settlement", settlement: s })}
              />
            );
          })}
          {overview.items.map((item) => {
            const n = item.share_count;
            const sub = item.blocked_by_settlement
              ? "Nieuw sinds de lopende afrekening"
              : `${n} ${n === 1 ? "aandeel" : "aandelen"}`;
            const [title, pill, tone] =
              item.direction === "i_owe"   ? [`Jij betaalt ${item.counterparty}`, "Te betalen", TONE.owe] :
              item.direction === "owes_me" ? [`${item.counterparty} betaalt jou`, "Te ontvangen", TONE.owed] :
                                             [`Quitte met ${item.counterparty}`, "Wegstrepen", TONE.muted];
            return (
              <Row
                key={`${item.counterparty_id}-${item.currency}`}
                user={resolveUser(item.counterparty_id, users)}
                name={item.counterparty}
                title={title}
                sub={sub}
                amount={item.amount}
                currency={item.currency}
                pill={pill}
                tone={tone}
                muted={item.blocked_by_settlement}
                onClick={() => onOpen({ kind: "item", item })}
              />
            );
          })}
        </ul>
      )}

      {done.length > 0 && (
        <div className="border-t border-line px-4 pb-3 pt-2.5">
          <p className="mb-1 text-[11.5px] font-semibold text-ink-3">Recent afgerond</p>
          <ul className="space-y-0.5">
            {done.map((s) => {
              const d = describeSettlement(s, meId);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onOpen({ kind: "settlement", settlement: s })}
                    className="flex w-full items-center justify-between gap-2 text-left text-[12px] text-ink-2 hover:text-ink"
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
