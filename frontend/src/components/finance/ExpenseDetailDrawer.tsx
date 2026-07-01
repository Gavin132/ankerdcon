import { useState } from "react";
import { CheckCircle2, Clock, Circle, Trash2, Copy, Check } from "lucide-react";
import { Drawer } from "../common/Drawer";
import { Button } from "../common/Button";
import { UserAvatar } from "../common/UserAvatar";
import { useClaimShare, useConfirmShare, useDeleteExpense } from "../../hooks/useExpenses";
import { formatAmount, formatDate } from "../../utils/format";
import { toast } from "../../store/toast.store";
import type { Expense, ExpenseShare, User } from "../../types";

interface Props {
  expense: Expense | null;
  onClose: () => void;
  users: User[];
  me: string | undefined;
}

function resolveUser(name: string, users: User[]) {
  return users.find((u) => u.name === name || u.discord_username === name || u.aliases?.includes(name));
}

const STATUS_CONFIG = {
  pending:   { label: "Te betalen",        dot: "bg-slate-300 dark:bg-slate-600",  text: "text-slate-500 dark:text-slate-400",       bg: "bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.06]" },
  claimed:   { label: "Wacht op bevestiging", dot: "bg-amber-400",                 text: "text-amber-600 dark:text-amber-400",        bg: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20" },
  confirmed: { label: "Verrekend",          dot: "bg-emerald-500",                 text: "text-emerald-600 dark:text-emerald-400",    bg: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20" },
} as const;

function StatusIcon({ status }: { status: ExpenseShare["status"] }) {
  if (status === "confirmed") return <CheckCircle2 size={14} className="text-emerald-500" />;
  if (status === "claimed")   return <Clock        size={14} className="text-amber-500" />;
  return                             <Circle       size={14} className="text-slate-300 dark:text-slate-600" />;
}

function CopyRef({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
      title="Kopieer referentie"
    >
      {copied ? <Check size={9} className="text-emerald-500" /> : <Copy size={9} />}
      {value}
    </button>
  );
}

export function ExpenseDetailDrawer({ expense, onClose, users, me }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const claimMutation   = useClaimShare();
  const confirmMutation = useConfirmShare();
  const deleteMutation  = useDeleteExpense();

  const isPayer = expense?.paid_by === me;

  async function handleClaim(shareId: string) {
    try {
      await claimMutation.mutateAsync(shareId);
      toast("success", "Betaling gemarkeerd als verzonden.");
    } catch {
      toast("error", "Kon status niet bijwerken.");
    }
  }

  async function handleConfirm(shareId: string) {
    try {
      await confirmMutation.mutateAsync(shareId);
      toast("success", "Betaling bevestigd!");
    } catch {
      toast("error", "Kon status niet bijwerken.");
    }
  }

  async function handleDelete() {
    if (!expense || !me) return;
    try {
      await deleteMutation.mutateAsync({ id: expense.id, userName: me });
      toast("success", `"${expense.description}" verwijderd.`);
      setConfirmDelete(false);
      onClose();
    } catch {
      toast("error", "Kon de uitgave niet verwijderen.");
    }
  }

  if (!expense) return null;

  const confirmedCount = expense.shares.filter((s) => s.status === "confirmed").length;
  const totalShares    = expense.shares.length;

  return (
    <Drawer
      open={!!expense}
      onClose={() => { onClose(); setConfirmDelete(false); }}
      title={expense.description}
      subtitle={`${formatDate(expense.date)} · betaald door ${expense.paid_by}`}
    >
      <div className="space-y-5">

        {/* ── Amount hero ─────────────────────────────────────── */}
        <div className="flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] px-4 py-3">
          <div className="flex items-center gap-3">
            <UserAvatar
              name={expense.paid_by}
              user={resolveUser(expense.paid_by, users)}
              className="h-10 w-10 text-sm rounded-xl shrink-0"
            />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Betaald door</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{expense.paid_by}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {formatAmount(expense.amount, expense.currency)}
            </p>
            {totalShares > 0 && (
              <p className="text-[11px] text-slate-400 mt-0.5">{confirmedCount}/{totalShares} verrekend</p>
            )}
          </div>
        </div>

        {/* ── Shares list ─────────────────────────────────────── */}
        {expense.shares.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
              Verdeling
            </p>
            <div className="space-y-2">
              {expense.shares.map((share) => {
                const cfg       = STATUS_CONFIG[share.status];
                const isMe      = share.participant === me;
                const canClaim  = isMe && share.status === "pending";
                const canConfirm = isPayer && share.status === "claimed";
                const isLoading = claimMutation.isPending || confirmMutation.isPending;

                return (
                  <div
                    key={share.id}
                    className={`rounded-xl border px-3 py-2.5 ${cfg.bg}`}
                  >
                    {/* Row: avatar + name + amount + status */}
                    <div className="flex items-center gap-2.5">
                      <UserAvatar
                        name={share.participant}
                        user={resolveUser(share.participant, users)}
                        className="h-7 w-7 text-[10px] rounded-lg shrink-0"
                      />
                      <span className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {share.participant}
                        {isMe && <span className="ml-1.5 text-[10px] font-bold text-slate-400">(jij)</span>}
                      </span>
                      <span className="text-sm font-black text-slate-900 dark:text-white shrink-0">
                        {formatAmount(share.amount, expense.currency)}
                      </span>
                    </div>

                    {/* Status + ref + action */}
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <StatusIcon status={share.status} />
                        <span className={`text-[11px] font-semibold ${cfg.text}`}>{cfg.label}</span>
                      </div>
                      <CopyRef value={share.payment_ref} />

                      {/* Action button */}
                      {canClaim && (
                        <button
                          type="button"
                          onClick={() => handleClaim(share.id)}
                          disabled={isLoading}
                          className="ml-auto flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1 text-[11px] font-bold text-white hover:bg-sky-600 disabled:opacity-50 transition-colors"
                        >
                          Ik heb betaald
                        </button>
                      )}
                      {canConfirm && (
                        <button
                          type="button"
                          onClick={() => handleConfirm(share.id)}
                          disabled={isLoading}
                          className="ml-auto flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1 text-[11px] font-bold text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                        >
                          <Check size={11} />
                          Ontvangen
                        </button>
                      )}
                      {share.status === "confirmed" && (
                        <CheckCircle2 size={14} className="ml-auto text-emerald-500" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Delete (payer only) ──────────────────────────── */}
        {isPayer && (
          <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06]">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-rose-500 transition-colors"
              >
                <Trash2 size={14} />
                Uitgave verwijderen
              </button>
            ) : (
              <div className="rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 p-3 space-y-3">
                <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                  Weet je zeker dat je "{expense.description}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" className="flex-1 text-xs" onClick={() => setConfirmDelete(false)}>
                    Annuleren
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1 text-xs"
                    loading={deleteMutation.isPending}
                    onClick={handleDelete}
                  >
                    <Trash2 size={12} />
                    Verwijderen
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
}
