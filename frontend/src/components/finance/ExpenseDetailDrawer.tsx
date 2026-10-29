import { useState } from "react";
import { CheckCircle2, Clock, Circle, Trash2, Check } from "lucide-react";
import { TripSheet } from "../trip/TripSheet";
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
  pending:   { label: "Te betalen",           pill: "pill-bad" },
  claimed:   { label: "Wacht op bevestiging", pill: "pill-warn" },
  confirmed: { label: "Verrekend",            pill: "pill-ok" },
} as const;

const OWN_PART_CONFIG = { label: "Eigen deel", pill: "pill-neutral" };
const IN_SETTLEMENT_CONFIG = { label: "In afrekening", pill: "bg-brand-soft text-brand-text" };

function StatusIcon({ status }: { status: ExpenseShare["status"] }) {
  if (status === "confirmed") return <CheckCircle2 size={12} />;
  if (status === "claimed")   return <Clock        size={12} />;
  return                             <Circle       size={12} />;
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
      await deleteMutation.mutateAsync(expense.id);
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
    <TripSheet
      open={!!expense}
      onClose={() => { onClose(); setConfirmDelete(false); }}
      title={expense.description}
      subtitle={`${formatDate(expense.date)} · betaald door ${expense.paid_by}`}
    >
      <div className="space-y-5">

        {/* ── Amount hero ─────────────────────────────────────── */}
        <div className="flex items-center justify-between card-surface gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <UserAvatar
              name={expense.paid_by}
              user={resolveUser(expense.paid_by, users)}
              className="h-10 w-10 shrink-0 text-sm"
            />
            <div className="min-w-0">
              <p className="section-label">Betaald door</p>
              <p className="truncate text-sm font-semibold text-ink">{expense.paid_by}</p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-[26px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-ink">
              {formatAmount(expense.amount, expense.currency)}
            </p>
            {totalShares > 0 && (
              <p className="mt-1 font-mono text-[12px] tabular-nums text-ink-3">{confirmedCount}/{totalShares} verrekend</p>
            )}
          </div>
        </div>

        {/* ── Shares list ─────────────────────────────────────── */}
        {expense.shares.length > 0 && (
          <div>
            <p className="section-label mb-2">
              Verdeling
            </p>
            <div className="card-surface divide-y divide-line overflow-hidden">
              {expense.shares.map((share) => {
                // The payer's own part of the bill — settled from the start, nothing to pay or confirm.
                const isOwnPart = share.participant === expense.paid_by;
                // Being paid as part of a settle-up payment (Afrekenen) — handled there.
                const inSettlement = !!share.settlement_id && share.status !== "confirmed";
                const cfg       = isOwnPart ? OWN_PART_CONFIG : inSettlement ? IN_SETTLEMENT_CONFIG : STATUS_CONFIG[share.status];
                const isMe      = share.participant === me;
                const canClaim  = isMe && !isOwnPart && !inSettlement && share.status === "pending";
                // Straight from pending too, for cash handed over in person.
                const canConfirm = isPayer && !isOwnPart && !inSettlement && share.status !== "confirmed";
                const isLoading = claimMutation.isPending || confirmMutation.isPending;

                return (
                  <div
                    key={share.id}
                    className="px-3 py-2.5"
                  >
                    {/* Row: avatar + name + amount + status */}
                    <div className="flex items-center gap-2.5">
                      <UserAvatar
                        name={share.participant}
                        user={resolveUser(share.participant, users)}
                        className="h-7 w-7 shrink-0 text-[12px]"
                      />
                      <span className="flex-1 truncate text-[13.5px] font-semibold text-ink">
                        {share.participant}
                        {isMe && <span className="ml-1.5 text-[12px] font-medium text-ink-3">(jij)</span>}
                      </span>
                      <span className="shrink-0 font-mono text-[14px] font-semibold tabular-nums text-ink">
                        {formatAmount(share.amount, expense.currency)}
                      </span>
                    </div>

                    {/* Status + action */}
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className={`pill gap-1.5 ${cfg.pill}`}>
                        <StatusIcon status={share.status} />
                        {cfg.label}
                      </span>

                      {/* Action button */}
                      {canClaim && (
                        <button
                          type="button"
                          onClick={() => handleClaim(share.id)}
                          disabled={isLoading}
                          className="btn-primary hit-area ml-auto min-h-9 px-3 text-[12px]"
                        >
                          Ik heb betaald
                        </button>
                      )}
                      {canConfirm && (
                        <button
                          type="button"
                          onClick={() => handleConfirm(share.id)}
                          disabled={isLoading}
                          className="btn-primary hit-area ml-auto min-h-9 px-3 text-[12px]"
                        >
                          <Check size={12} />
                          Ontvangen
                        </button>
                      )}
                      {share.status === "confirmed" && (
                        <CheckCircle2 size={14} className="ml-auto text-ok" />
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
          <div className="border-t-1.5 border-line pt-3">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex min-h-11 items-center gap-2 text-sm font-semibold text-ink-3 transition-colors hover:text-bad"
              >
                <Trash2 size={14} />
                Uitgave verwijderen
              </button>
            ) : (
              <div className="space-y-3 rounded-xl bg-bad-soft p-3">
                <p className="text-xs font-semibold text-bad">
                  Weet je zeker dat je "{expense.description}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1 text-xs" onClick={() => setConfirmDelete(false)}>
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
    </TripSheet>
  );
}
