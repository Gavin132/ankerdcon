import { useState } from "react";
import { motion } from "framer-motion";
import { Wallet, Plus, ArrowRight, MessageCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../components/common/Button";
import { Drawer } from "../components/common/Drawer";
import { PaymentCardSkeleton } from "../components/common/Skeleton";
import { EmptyState } from "../components/common/EmptyState";
import { NamePicker } from "../components/common/NamePicker";
import { PaymentCard } from "../components/finance/PaymentCard";
import { SplitBuilder } from "../components/finance/SplitBuilder";
import { usePayments, useCreatePayment } from "../hooks/usePayments";
import { useUsers } from "../hooks/useUsers";
import { formatCurrency } from "../utils/format";
import { avatarColor, personInitial } from "../utils/avatar";
import { computeDebts, whatsappText } from "../utils/finance";
import { toast } from "../store/toast.store";
import { listContainer } from "../utils/motion";
import type { Split } from "../types";

const createSchema = z.object({
  paid_by: z.string().min(1, "Verplicht"),
  amount: z.coerce.number().positive("Voer een positief bedrag in"),
  description: z.string().min(1, "Verplicht"),
  date: z.string().min(1, "Verplicht"),
});

type CreateForm = z.infer<typeof createSchema>;

const SL = "block text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5";
const SF = "space-y-4 rounded-2xl border border-slate-100 dark:border-white/[0.07] bg-slate-50 dark:bg-white/[0.03] p-4";
const ST = "text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3";

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
    setValue,
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
      <div className="space-y-3">
        {[0, 1, 2].map((i) => <PaymentCardSkeleton key={i} />)}
      </div>
    );
  }

  const allPayments = payments ?? [];

  const totals: Record<string, number> = {};
  for (const p of allPayments) {
    totals[p.paid_by] = (totals[p.paid_by] ?? 0) + p.amount;
  }
  const totalAll = Object.values(totals).reduce((s, n) => s + n, 0);
  const debts = computeDebts(allPayments);

  const footer = (
    <Button
      type="submit"
      form="create-payment-form"
      loading={isSubmitting}
      className="w-full"
    >
      Betaling opslaan
    </Button>
  );

  return (
    <div className="space-y-5">

      {/* ── Hero total ──────────────────────────────────────── */}
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
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Debt summary ────────────────────────────────────── */}
      {debts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}>
          <div className="card-surface rounded-2xl overflow-hidden">
            <div className="h-[3px] bg-gradient-to-r from-rose-400 via-pink-400 to-rose-300" />
            <div className="px-4 pt-4 pb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                Schulden overzicht
              </p>
              <div className="space-y-2">
                {debts.map((debt, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-black/20 px-3 py-2.5">
                    <div className="flex flex-1 items-center gap-2 min-w-0">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-xs font-black text-white ${avatarColor(debt.from)}`}>
                        {personInitial(debt.from)}
                      </div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{debt.from}</span>
                      <ArrowRight size={11} className="text-slate-300 dark:text-slate-600 shrink-0" />
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-xs font-black text-white ${avatarColor(debt.to)}`}>
                        {personInitial(debt.to)}
                      </div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{debt.to}</span>
                    </div>
                    <span className="shrink-0 text-sm font-black text-slate-800 dark:text-white">
                      {formatCurrency(debt.amount)}
                    </span>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(whatsappText(debt))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                      title="Stuur WhatsApp"
                    >
                      <MessageCircle size={14} />
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
        <motion.div className="space-y-3" variants={listContainer} initial="hidden" animate="show">
          {allPayments.map((payment) => (
            <PaymentCard key={payment.id} payment={payment} userNames={userNames} />
          ))}
        </motion.div>
      )}

      {/* ── Create drawer ────────────────────────────────────── */}
      <Drawer
        open={createOpen}
        onClose={handleClose}
        title="Betaling toevoegen"
        subtitle="Registreer een groepsuitgave"
        footer={footer}
      >
        <form id="create-payment-form" onSubmit={handleSubmit(onCreate)} className="space-y-5">

          {/* Betaler */}
          <div className={SF}>
            <p className={ST}>Betaler</p>
            <div>
              <label className={SL}>Betaald door</label>
              <NamePicker
                options={userNames}
                value={watch("paid_by") ?? ""}
                onChange={(name) => setValue("paid_by", name, { shouldValidate: true })}
                color="sky"
                placeholder="Zoek naam…"
              />
              {errors.paid_by && (
                <p className="mt-1.5 text-xs text-rose-500">{errors.paid_by.message}</p>
              )}
            </div>
          </div>

          {/* Bedrag & datum */}
          <div className={SF}>
            <p className={ST}>Bedrag & datum</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={SL}>Bedrag (€)</label>
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
                <label className={SL}>Datum</label>
                <input type="date" className="input-field dark:[color-scheme:dark]" {...register("date")} />
              </div>
            </div>
          </div>

          {/* Omschrijving */}
          <div className={SF}>
            <p className={ST}>Omschrijving</p>
            <div>
              <label className={SL}>Wat was het voor?</label>
              <input
                className="input-field"
                placeholder="Bijv. Parkeerkosten Jaarbeurs"
                {...register("description")}
              />
              {errors.description && (
                <p className="mt-1.5 text-xs text-rose-500">{errors.description.message}</p>
              )}
            </div>
          </div>

          {/* Verdeling */}
          <div className={SF}>
            <p className={ST}>Verdeling (optioneel)</p>
            <SplitBuilder
              splits={splits}
              onChange={setSplits}
              userNames={userNames}
              totalAmount={Number(watchedAmount) || 0}
            />
          </div>
        </form>
      </Drawer>
    </div>
  );
}
