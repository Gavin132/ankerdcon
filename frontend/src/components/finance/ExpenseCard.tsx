import { motion } from "framer-motion";
import { UserAvatar } from "../common/UserAvatar";
import { formatAmount, formatDate } from "../../utils/format";
import { listItem } from "../../utils/motion";
import type { Expense, User } from "../../types";

interface Props {
  expense: Expense;
  users: User[];
  me: string | undefined;
  onClick: () => void;
  /** Name of the trip the expense is linked to, if any. */
  tripTitle?: string;
}

function resolveUser(name: string, users: User[]) {
  return users.find((u) => u.name === name || u.discord_username === name || u.aliases?.includes(name));
}

const PILL = "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold before:h-1.5 before:w-1.5 before:rounded-full before:bg-current before:content-['']";

const STATUS_PILL = {
  confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  claimed:   "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  pending:   "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
} as const;

/** One expense as a row in the Financiën list panel. */
export function ExpenseCard({ expense, users, me, onClick, tripTitle }: Props) {
  const confirmedCount = expense.shares.filter((s) => s.status === "confirmed").length;
  const totalShares    = expense.shares.length;
  const allConfirmed   = totalShares > 0 && confirmedCount === totalShares;

  const myShare = expense.shares.find((s) => s.participant === me);
  const iAm    = expense.paid_by === me;

  return (
    <motion.div variants={listItem}>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-sunken"
      >
        {/* Payer avatar */}
        <UserAvatar
          name={expense.paid_by}
          user={resolveUser(expense.paid_by, users)}
          className="h-9 w-9 shrink-0 text-xs"
        />

        {/* Main info */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold leading-snug text-ink">
            {expense.description}
          </p>
          <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12px] text-ink-3">
            <span className="shrink-0 font-mono text-ink-2">{formatDate(expense.date)}</span>
            <span aria-hidden>·</span>
            <span className="truncate">{expense.paid_by}</span>
            {tripTitle && (
              <>
                <span aria-hidden>·</span>
                <span className="truncate">{tripTitle}</span>
              </>
            )}
          </p>
          {myShare && !iAm && totalShares > 0 && (
            <span className={`mt-1.5 ${PILL} ${STATUS_PILL[myShare.status]}`}>
              {myShare.status === "confirmed"
                ? "Betaald"
                : myShare.status === "claimed"
                ? "In afwachting"
                : `Jij: ${formatAmount(myShare.amount, expense.currency)}`}
            </span>
          )}
        </div>

        {/* Amount + settle progress */}
        <div className="shrink-0 text-right">
          <p className="font-mono text-[15px] font-semibold leading-none tabular-nums text-ink">
            {formatAmount(expense.amount, expense.currency)}
          </p>
          {totalShares > 0 && (
            allConfirmed ? (
              <span className={`mt-1.5 ${PILL} ${STATUS_PILL.confirmed}`}>Verrekend</span>
            ) : (
              <span className="mt-1.5 flex items-center justify-end gap-2 whitespace-nowrap">
                <span className="hidden h-1.5 w-12 overflow-hidden rounded-full sm:block bg-sunken shadow-[inset_0_0_0_1px_rgb(var(--line))]" aria-hidden>
                  <span
                    className="block h-full bg-emerald-500"
                    style={{ width: `${(confirmedCount / totalShares) * 100}%` }}
                  />
                </span>
                <span className="font-mono text-[11.5px] tabular-nums text-ink-3">{confirmedCount}/{totalShares} verrekend</span>
              </span>
            )
          )}
        </div>
      </button>
    </motion.div>
  );
}
