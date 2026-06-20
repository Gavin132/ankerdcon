import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  Plus,
  User,
  Calendar,
  ChevronDown,
  Trash2,
  ArrowRight,
  MessageCircle,
  UserPlus,
  X,
  Receipt,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { Modal } from "../components/common/Modal";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { EmptyState } from "../components/common/EmptyState";
import { usePayments, useCreatePayment, useDeletePayment } from "../hooks/usePayments";
import { useUsers } from "../hooks/useUsers";
import { formatDate, formatCurrency } from "../utils/format";
import { toast } from "../store/toast.store";
import type { Payment, Split } from "../types";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const createSchema = z.object({
  paid_by: z.string().min(1, "Verplicht"),
  amount: z.coerce.number().positive("Voer een positief bedrag in"),
  description: z.string().min(1, "Verplicht"),
  date: z.string().min(1, "Verplicht"),
});

type CreateForm = z.infer<typeof createSchema>;

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const cardItem = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PERSON_COLORS = [
  "from-sky-400 to-blue-500",
  "from-violet-400 to-purple-500",
  "from-emerald-400 to-teal-500",
  "from-rose-400 to-pink-500",
  "from-amber-400 to-orange-500",
];

function personColor(name: string) {
  return PERSON_COLORS[name.charCodeAt(0) % PERSON_COLORS.length];
}

function personInitial(name: string) {
  return name[0]?.toUpperCase() ?? "?";
}

// Compute net debts from all payments that have splits
interface Debt {
  from: string;
  to: string;
  amount: number;
}

function computeDebts(payments: Payment[]): Debt[] {
  // net[debtor][creditor] = amount owed
  const net: Record<string, Record<string, number>> = {};

  for (const p of payments) {
    if (!p.splits || p.splits.length === 0) continue;
    for (const split of p.splits) {
      if (split.name === p.paid_by) continue;
      if (!net[split.name]) net[split.name] = {};
      net[split.name][p.paid_by] = (net[split.name][p.paid_by] ?? 0) + split.amount;
    }
  }

  const result: Debt[] = [];
  const seen = new Set<string>();

  for (const [debtor, creditors] of Object.entries(net)) {
    for (const [creditor, amount] of Object.entries(creditors)) {
      const key = [debtor, creditor].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);

      const reverse = net[creditor]?.[debtor] ?? 0;
      const netAmt = amount - reverse;
      if (netAmt > 0.005) result.push({ from: debtor, to: creditor, amount: netAmt });
      else if (netAmt < -0.005) result.push({ from: creditor, to: debtor, amount: -netAmt });
    }
  }

  return result.sort((a, b) => b.amount - a.amount);
}

function whatsappText(debt: Debt) {
  return `Hé ${debt.from}! Je bent nog ${formatCurrency(debt.amount)} verschuldigd aan ${debt.to}. Kun je dit zo snel mogelijk overmaken? 💸`;
}

// ---------------------------------------------------------------------------
// PaymentCard
// ---------------------------------------------------------------------------

function PaymentCard({
  payment,
  userNames,
}: {
  payment: Payment;
  userNames: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteName, setDeleteName] = useState("");
  const deleteMutation = useDeletePayment();

  async function onDelete() {
    if (!deleteName) return;
    try {
      await deleteMutation.mutateAsync({ rowNumber: payment.row_number, userName: deleteName });
      setDeleteOpen(false);
      toast("success", `"${payment.description}" is verwijderd.`);
    } catch {
      toast("error", "Kon de betaling niet verwijderen. Ben jij de betaler?");
    }
  }

  const hasSplits = payment.splits && payment.splits.length > 0;

  return (
    <>
      <motion.div variants={cardItem}>
        <div className="card-surface rounded-2xl overflow-hidden">
          <div className="p-4">
            {/* Header row */}
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-black text-white ${personColor(payment.paid_by)}`}
              >
                {personInitial(payment.paid_by)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-900 text-sm truncate">{payment.description}</p>
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

            {/* Splits badge summary (collapsed) */}
            {hasSplits && !expanded && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {payment.splits.map((s) => (
                  <Badge key={s.name} variant="blue">
                    {s.name} · {formatCurrency(s.amount)}
                  </Badge>
                ))}
              </div>
            )}

            {/* Expanded splits + actions */}
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
                        <div key={s.name} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-xs font-black text-white ${personColor(s.name)}`}
                            >
                              {personInitial(s.name)}
                            </div>
                            <span className="text-xs font-semibold text-slate-700">{s.name}</span>
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

            {/* Delete button */}
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

      {/* Delete confirmation */}
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

// ---------------------------------------------------------------------------
// SplitBuilder (used inside create modal)
// ---------------------------------------------------------------------------

function SplitBuilder({
  splits,
  onChange,
  userNames,
  totalAmount,
}: {
  splits: Split[];
  onChange: (splits: Split[]) => void;
  userNames: string[];
  totalAmount: number;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");

  const usedNames = splits.map((s) => s.name);
  const available = userNames.filter((n) => !usedNames.includes(n));
  const splitTotal = splits.reduce((s, x) => s + x.amount, 0);
  const remaining = Math.max(0, totalAmount - splitTotal);

  function add() {
    const amt = parseFloat(amount);
    if (!name || isNaN(amt) || amt <= 0) return;
    onChange([...splits, { name, amount: amt }]);
    setName("");
    setAmount("");
  }

  function remove(idx: number) {
    onChange(splits.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Verdeling (optioneel)
        </label>
        {splits.length > 0 && (
          <span className={`text-xs font-semibold ${Math.abs(remaining) < 0.01 ? "text-emerald-600" : "text-amber-600"}`}>
            Restant: {formatCurrency(remaining)}
          </span>
        )}
      </div>

      {/* Existing splits */}
      {splits.length > 0 && (
        <div className="space-y-1.5">
          {splits.map((s, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-xs font-black text-white ${personColor(s.name)}`}>
                {personInitial(s.name)}
              </div>
              <span className="flex-1 text-xs font-semibold text-slate-700">{s.name}</span>
              <span className="text-xs font-bold text-slate-800">{formatCurrency(s.amount)}</span>
              <button onClick={() => remove(i)} className="text-slate-300 hover:text-rose-400 transition-colors ml-1">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add row */}
      <div className="flex gap-2">
        <select
          className="input-field flex-1 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
        >
          <option value="">Persoon…</option>
          {(available.length > 0 ? available : userNames).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <input
          type="number"
          step="0.01"
          min="0"
          className="input-field w-24 text-sm"
          placeholder="€0,00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
        />
        <button
          type="button"
          onClick={add}
          disabled={!name || !amount}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-sky-600 transition-colors"
        >
          <UserPlus size={15} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FinancePage
// ---------------------------------------------------------------------------

export function FinancePage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [splits, setSplits] = useState<Split[]>([]);
  const { data: payments, isLoading } = usePayments();
  const { data: users } = useUsers();
  const userNames = (users ?? []).map((u) => u.name);
  const createMutation = useCreatePayment();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { date: new Date().toISOString().split("T")[0] },
  });

  const watchedAmount = watch("amount") ?? 0;

  function handleClose() {
    setCreateOpen(false);
    reset({ date: new Date().toISOString().split("T")[0] });
    setSplits([]);
  }

  async function onCreate(values: CreateForm) {
    try {
      await createMutation.mutateAsync({ ...values, splits });
      toast("success", `"${values.description}" is toegevoegd!`);
      handleClose();
    } catch {
      toast("error", "Kon de betaling niet toevoegen. Probeer opnieuw.");
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner />
      </div>
    );
  }

  const allPayments = payments ?? [];

  // Totals per payer
  const totals: Record<string, number> = {};
  for (const p of allPayments) {
    totals[p.paid_by] = (totals[p.paid_by] ?? 0) + p.amount;
  }
  const totalAll = Object.values(totals).reduce((s, n) => s + n, 0);

  // Debts
  const debts = computeDebts(allPayments);

  return (
    <div className="space-y-5">
      {/* Hero total */}
      {totalAll > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative overflow-hidden rounded-3xl gradient-hero shadow-hero p-5">
            <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-sky-400/10" />
            <div className="pointer-events-none absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-white/5" />

            <div className="relative">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-400/20">
                  <Wallet size={16} className="text-sky-300" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-sky-300">
                  Totaal uitgegeven
                </span>
              </div>
              <div className="text-4xl font-black text-white mt-1">{formatCurrency(totalAll)}</div>

              {Object.keys(totals).length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {Object.entries(totals).map(([name, amount]) => (
                    <div
                      key={name}
                      className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 backdrop-blur-sm border border-white/10"
                    >
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-xs font-black text-white ${personColor(name)}`}
                      >
                        {personInitial(name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{name}</p>
                        <p className="text-xs text-sky-200 font-bold">{formatCurrency(amount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Debt summary */}
      {debts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}>
          <div className="card-surface rounded-2xl overflow-hidden">
            <div className="px-4 pt-4 pb-3">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                Schulden overzicht
              </p>
              <div className="space-y-2">
                {debts.map((debt, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex flex-1 items-center gap-2 min-w-0">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-xs font-black text-white ${personColor(debt.from)}`}
                      >
                        {personInitial(debt.from)}
                      </div>
                      <span className="text-xs font-semibold text-slate-700 truncate">{debt.from}</span>
                      <ArrowRight size={12} className="text-slate-300 shrink-0" />
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-xs font-black text-white ${personColor(debt.to)}`}
                      >
                        {personInitial(debt.to)}
                      </div>
                      <span className="text-xs font-semibold text-slate-700 truncate">{debt.to}</span>
                    </div>
                    <span className="shrink-0 text-sm font-black text-slate-800">
                      {formatCurrency(debt.amount)}
                    </span>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(whatsappText(debt))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                      title="Stuur WhatsApp"
                    >
                      <MessageCircle size={15} />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <Button variant="secondary" className="w-full" onClick={() => setCreateOpen(true)}>
        <Plus size={16} />
        Betaling toevoegen
      </Button>

      {allPayments.length === 0 ? (
        <EmptyState
          icon={<Wallet size={36} />}
          title="Geen uitgaven"
          description="Voeg de eerste betaling toe om de groepskas bij te houden."
        />
      ) : (
        <motion.div className="space-y-3" variants={container} initial="hidden" animate="show">
          {allPayments.map((payment) => (
            <PaymentCard key={payment.row_number} payment={payment} userNames={userNames} />
          ))}
        </motion.div>
      )}

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={handleClose}
        title="Betaling toevoegen"
        description="Registreer een groepsuitgave"
      >
        <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Betaald door
            </label>
            {userNames.length > 0 ? (
              <select className="input-field" {...register("paid_by")}>
                <option value="">Selecteer naam…</option>
                {userNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            ) : (
              <input className="input-field" placeholder="Naam" {...register("paid_by")} />
            )}
            {errors.paid_by && (
              <p className="mt-1.5 text-xs text-rose-500">{errors.paid_by.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
                Bedrag (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input-field"
                placeholder="0,00"
                {...register("amount")}
              />
              {errors.amount && (
                <p className="mt-1.5 text-xs text-rose-500">{errors.amount.message}</p>
              )}
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
                Datum
              </label>
              <input type="date" className="input-field" {...register("date")} />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Omschrijving
            </label>
            <input
              className="input-field"
              placeholder="Bijv. Parkeerkosten Jaarbeurs"
              {...register("description")}
            />
            {errors.description && (
              <p className="mt-1.5 text-xs text-rose-500">{errors.description.message}</p>
            )}
          </div>

          {/* Split builder */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <SplitBuilder
              splits={splits}
              onChange={setSplits}
              userNames={userNames}
              totalAmount={Number(watchedAmount) || 0}
            />
          </div>

          <Button type="submit" loading={isSubmitting} className="w-full">
            Betaling opslaan
          </Button>
        </form>
      </Modal>
    </div>
  );
}
