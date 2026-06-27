import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ChevronDown, Trash2, Receipt } from "lucide-react";
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";
import { useDeletePayment } from "../../hooks/usePayments";
import { useUsers } from "../../hooks/useUsers";
import { NamePicker } from "../common/NamePicker";
import { formatDate, formatCurrency } from "../../utils/format";
import { UserAvatar } from "../common/UserAvatar";
import { toast } from "../../store/toast.store";
import { listItem } from "../../utils/motion";
import { PaymentCardProps } from "../../types/interfaces";

export function PaymentCard({ payment, userNames }: PaymentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteName, setDeleteName] = useState("");

  const deleteMutation = useDeletePayment();
  const hasSplits = payment.splits && payment.splits.length > 0;
  const { data: users = [] } = useUsers();

  function resolveUser(stored: string) {
    return users.find((u) => u.name === stored || u.discord_username === stored || u.aliases?.includes(stored));
  }
  function resolveName(stored: string) {
    return resolveUser(stored)?.name ?? stored;
  }

  async function onDelete() {
    if (!deleteName) return;
    try {
      await deleteMutation.mutateAsync({ id: payment.id, userName: deleteName });
      setDeleteOpen(false);
      toast("success", `"${payment.description}" is verwijderd.`);
    } catch {
      toast("error", "Kon de betaling niet verwijderen. Ben jij de betaler?");
    }
  }

  return (
    <>
      <motion.div variants={listItem}>
        <div className="card-surface rounded-2xl overflow-hidden">

          {/* Emerald accent line */}
          <div className="h-[3px] bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-300" />

          {/* ── Header: description + amount ─────────────────── */}
          <div className="flex items-start justify-between gap-4 px-4 pt-4 pb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 text-sm leading-snug">{payment.description}</h3>
              <span className="mt-1 flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                <Calendar size={10} className="shrink-0" />
                {formatDate(payment.date)}
              </span>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 leading-none">
                {formatCurrency(payment.amount)}
              </p>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5 uppercase tracking-wide">totaal</p>
            </div>
          </div>

          {/* ── Payer row ─────────────────────────────────────── */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-t border-slate-200 dark:border-slate-700">
            <UserAvatar
              name={payment.paid_by}
              user={resolveUser(payment.paid_by)}
              className="h-7 w-7 text-[11px] rounded-lg shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Betaald door</p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                {resolveName(payment.paid_by)}
              </p>
            </div>
            {hasSplits && (
              <span className="shrink-0 flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <Receipt size={9} />
                {payment.splits.length} personen
              </span>
            )}
          </div>

          {/* ── Splits preview / expanded ─────────────────────── */}
          {hasSplits && (
            <>
              <AnimatePresence initial={false}>
                {!expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                      {payment.splits.map((s) => (
                        <span
                          key={s.name}
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-black/20 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300"
                        >
                          <UserAvatar name={s.name} user={resolveUser(s.name)} className="h-3.5 w-3.5 text-[7px] !border-0" />
                          {resolveName(s.name)}
                          <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(s.amount)}</span>
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3 space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Verdeling</p>
                      {payment.splits.map((s) => (
                        <div
                          key={s.name}
                          className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-black/20 px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <UserAvatar name={s.name} user={resolveUser(s.name)} className="h-6 w-6 text-[9px] rounded-lg" />
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                              {resolveName(s.name)}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(s.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* ── Action bar ────────────────────────────────────── */}
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-black/20 px-3 py-2">
            {hasSplits ? (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={13} />
                </motion.div>
                {expanded ? "Verbergen" : "Verdeling"}
              </button>
            ) : (
              <div />
            )}

            <button
              onClick={() => setDeleteOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-rose-500 transition-colors"
              title="Verwijderen"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </motion.div>

      <Modal
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteName(""); }}
        title="Betaling verwijderen"
        description={`Bevestig dat jij "${payment.paid_by}" bent om "${payment.description}" te verwijderen.`}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Jouw naam
            </label>
            <NamePicker
              options={userNames}
              value={deleteName}
              onChange={setDeleteName}
              color="rose"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setDeleteOpen(false)}>
              Annuleren
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              loading={deleteMutation.isPending}
              onClick={onDelete}
              disabled={!deleteName}
            >
              <Trash2 size={14} />
              Verwijderen
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
