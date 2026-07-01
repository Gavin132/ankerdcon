import { motion } from "framer-motion";
import { Calendar, CheckCircle2, Clock, Circle } from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { formatAmount, formatDate } from "../../utils/format";
import { listItem } from "../../utils/motion";
import type { Expense, User } from "../../types";

interface Props {
  expense: Expense;
  users: User[];
  me: string | undefined;
  onClick: () => void;
}

function resolveUser(name: string, users: User[]) {
  return users.find((u) => u.name === name || u.discord_username === name || u.aliases?.includes(name));
}

const STATUS_ICON = {
  confirmed: <CheckCircle2 size={11} className="text-emerald-500" />,
  claimed:   <Clock        size={11} className="text-amber-500" />,
  pending:   <Circle       size={11} className="text-slate-300 dark:text-slate-600" />,
} as const;

export function ExpenseCard({ expense, users, me, onClick }: Props) {
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
        className="w-full text-left card-surface rounded-2xl overflow-hidden hover:shadow-md active:scale-[0.99] transition-all duration-150"
      >
        {/* Accent bar */}
        <div className={`h-[3px] ${allConfirmed ? "bg-gradient-to-r from-emerald-400 to-teal-400" : "bg-gradient-to-r from-sky-400 to-indigo-500"}`} />

        <div className="px-4 pt-4 pb-3 flex items-start gap-3">
          {/* Payer avatar */}
          <UserAvatar
            name={expense.paid_by}
            user={resolveUser(expense.paid_by, users)}
            className="h-9 w-9 text-xs rounded-xl shrink-0 mt-0.5"
          />

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate leading-snug">
              {expense.description}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                <Calendar size={10} className="shrink-0" />
                {formatDate(expense.date)}
              </span>
              <span className="text-slate-200 dark:text-slate-700">·</span>
              <span className="text-[11px] text-slate-400 truncate">{expense.paid_by}</span>
            </div>
          </div>

          {/* Amount */}
          <div className="shrink-0 text-right">
            <p className="text-base font-black text-slate-900 dark:text-white leading-none">
              {formatAmount(expense.amount, expense.currency)}
            </p>
            {totalShares > 0 && (
              <p className={`text-[10px] font-semibold mt-0.5 ${allConfirmed ? "text-emerald-500" : "text-slate-400"}`}>
                {allConfirmed ? "Verrekend" : `${confirmedCount}/${totalShares} verrekend`}
              </p>
            )}
          </div>
        </div>

        {/* Share status strip */}
        {totalShares > 0 && (
          <div className="px-4 pb-3 flex items-center gap-3">
            {/* Status pill for current user */}
            {myShare && !iAm && (
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border ${
                myShare.status === "confirmed"
                  ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                  : myShare.status === "claimed"
                  ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400"
                  : "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400"
              }`}>
                {STATUS_ICON[myShare.status]}
                {myShare.status === "confirmed"
                  ? "Betaald"
                  : myShare.status === "claimed"
                  ? "In afwachting"
                  : `Jij: ${formatAmount(myShare.amount, expense.currency)}`}
              </span>
            )}

            {/* Per-share dots (compact) */}
            <div className="flex items-center gap-1 ml-auto">
              {expense.shares.map((s) => (
                <span key={s.id}>{STATUS_ICON[s.status]}</span>
              ))}
            </div>
          </div>
        )}
      </button>
    </motion.div>
  );
}
