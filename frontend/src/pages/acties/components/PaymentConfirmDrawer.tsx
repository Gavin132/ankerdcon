import { CheckCheck } from "lucide-react";
import { Drawer } from "../../../components/common/Drawer";
import { UserAvatar } from "../../../components/common/UserAvatar";
import { useConfirmShare } from "../../../hooks/useExpenses";
import { formatAmount, formatDate } from "../../../utils/format";
import { toast } from "../../../store/toast.store";
import { resolveUser } from "../helpers";
import type { Expense, ExpenseShare, User } from "../../../types";

export function PaymentConfirmDrawer({
  open,
  onClose,
  expense,
  shares,
  users,
}: {
  open: boolean;
  onClose: () => void;
  expense: Expense | null;
  shares: ExpenseShare[];
  users: User[];
}) {
  const confirm = useConfirmShare();

  if (!expense) return null;

  const sorted = [...shares].sort((a, b) => {
    if (a.status === "claimed" && b.status !== "claimed") return -1;
    if (b.status === "claimed" && a.status !== "claimed") return 1;
    return a.participant.localeCompare(b.participant);
  });

  const claimedCount = shares.filter((s) => s.status === "claimed").length;
  const pendingCount = shares.filter((s) => s.status === "pending").length;
  const totalOutstanding = shares.reduce((s, sh) => s + sh.amount, 0);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={expense.description}
      subtitle={`${formatAmount(totalOutstanding, expense.currency)} openstaand · ${formatDate(expense.date)}`}
    >
      <div className="flex gap-3 mb-5">
        {claimedCount > 0 && (
          <div className="flex-1 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 px-3 py-2.5 text-center">
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {claimedCount}
            </p>
            <p className="text-[10px] font-bold text-emerald-500/70 uppercase tracking-wider mt-0.5">
              Te bevestigen
            </p>
          </div>
        )}
        {pendingCount > 0 && (
          <div className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 px-3 py-2.5 text-center">
            <p className="text-xl font-black text-slate-600 dark:text-slate-300">
              {pendingCount}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
              Afwachtend
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {sorted.map((share) => {
          const u = resolveUser(share.participant, users);
          const isClaimed = share.status === "claimed";
          return (
            <div
              key={share.id}
              className={`rounded-xl border p-3.5 transition-colors ${
                isClaimed
                  ? "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5"
                  : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <UserAvatar
                  name={u?.name ?? share.participant}
                  user={u}
                  className="h-9 w-9 text-xs shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {u?.name ?? share.participant}
                  </p>
                  <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                    {share.payment_ref}
                  </p>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    {formatAmount(share.amount, expense.currency)}
                  </p>
                  {isClaimed ? (
                    <span className="inline-block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 rounded-full px-1.5 py-0.5">
                      Betaald
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-400">
                      Afwachtend
                    </span>
                  )}
                </div>
              </div>
              {isClaimed && (
                <div className="mt-3 pt-3 border-t border-emerald-100 dark:border-emerald-500/20">
                  <button
                    onClick={async () => {
                      try {
                        await confirm.mutateAsync(share.id);
                        toast(
                          "success",
                          `Betaling van ${u?.name ?? share.participant} bevestigd!`,
                        );
                      } catch {
                        toast("error", "Kon status niet bijwerken.");
                      }
                    }}
                    disabled={confirm.isPending}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 px-4 py-2.5 text-sm font-bold text-white transition-colors"
                  >
                    <CheckCheck size={14} />
                    {confirm.isPending ? "Bezig…" : "Bevestig ontvangst"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Drawer>
  );
}
