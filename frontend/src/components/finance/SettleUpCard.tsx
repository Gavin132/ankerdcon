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

const PILL = "pill";
const TONE = {
  owe:     "pill-bad",
  owed:    "pill-ok",
  waiting: "pill-warn",
  muted:   "pill-neutral",
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
        <UserAvatar name={name} user={user} className="h-8 w-8 shrink-0 text-[12px]" />
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 break-words text-[13.5px] font-semibold text-ink">{title}</span>
          <span className="block truncate text-[12px] text-ink-3">{sub}</span>
          <span className={`${PILL} ${tone} mt-1 inline-block`}>{pill}</span>
        </span>
        <span className="shrink-0 font-mono text-[14px] font-semibold tabular-nums text-ink">{formatAmount(amount, currency)}</span>
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
                sub={s.created_at ? `Sinds ${formatDate(s.created_at)}` : "Afrekening"}
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
          <p className="mb-1 text-[12px] font-semibold text-ink-3">Recent afgerond</p>
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
