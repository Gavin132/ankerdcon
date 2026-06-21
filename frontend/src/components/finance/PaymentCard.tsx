import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Calendar, ChevronDown, Trash2, Receipt } from "lucide-react";
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";
import { useDeletePayment } from "../../hooks/usePayments";
import { formatDate, formatCurrency } from "../../utils/format";
import { avatarColor, personInitial } from "../../utils/avatar";
import { toast } from "../../store/toast.store";
import { listItem } from "../../utils/motion";
import { PaymentCardProps } from "../../types/interfaces";

export function PaymentCard({ payment, userNames }: PaymentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteName, setDeleteName] = useState("");

  const deleteMutation = useDeletePayment();
  const hasSplits = payment.splits && payment.splits.length > 0;

  async function onDelete() {
    if (!deleteName) return;
    try {
      await deleteMutation.mutateAsync({
        rowNumber: payment.row_number,
        userName: deleteName,
      });
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
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-black text-white ${avatarColor(payment.paid_by)}`}
              >
                {personInitial(payment.paid_by)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-900 text-sm truncate">
                  {payment.description}
                </p>
                <div className="flex items-center gap-2.5 mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                    <User size={10} className="text-slate-400" />
                    {payment.paid_by}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Calendar size={10} />
                    {formatDate(payment.date)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-base font-black text-slate-800">
                  {formatCurrency(payment.amount)}
                </span>
                {hasSplits && (
                  <button
                    onClick={() => setExpanded((e) => !e)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
                  >
                    <motion.div
                      animate={{ rotate: expanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown size={15} />
                    </motion.div>
                  </button>
                )}
              </div>
            </div>

            {hasSplits && !expanded && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {payment.splits.map((s) => (
                  <span
                    key={s.name}
                    className="inline-flex items-center gap-1 rounded-full bg-sky-50 border border-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700"
                  >
                    {s.name} · {formatCurrency(s.amount)}
                  </span>
                ))}
              </div>
            )}

            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      <Receipt size={11} className="mr-1 inline" />
                      Verdeling
                    </p>
                    <div className="space-y-1.5">
                      {payment.splits.map((s) => (
                        <div
                          key={s.name}
                          className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-xs font-black text-white ${avatarColor(s.name)}`}
                            >
                              {personInitial(s.name)}
                            </div>
                            <span className="text-xs font-semibold text-slate-700">
                              {s.name}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-slate-800">
                            {formatCurrency(s.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-3 flex justify-end">
              <button
                onClick={() => setDeleteOpen(true)}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
              >
                <Trash2 size={12} />
                Verwijderen
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Betaling verwijderen"
        description={`Bevestig dat jij "${payment.paid_by}" bent om "${payment.description}" te verwijderen.`}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Jouw naam
            </label>
            <select
              className="input-field"
              value={deleteName}
              onChange={(e) => setDeleteName(e.target.value)}
            >
              <option value="">Selecteer naam…</option>
              {userNames.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => setDeleteOpen(false)}
            >
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
