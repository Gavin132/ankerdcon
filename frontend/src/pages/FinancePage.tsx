import { useState } from "react";
import { motion } from "framer-motion";
import { Wallet, Plus, User, Calendar, TrendingUp } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../components/common/Button";
import { Modal } from "../components/common/Modal";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { EmptyState } from "../components/common/EmptyState";
import { usePayments, useCreatePayment } from "../hooks/usePayments";
import { formatDate, formatCurrency } from "../utils/format";

const createSchema = z.object({
  paid_by: z.string().min(1, "Verplicht"),
  amount: z.coerce.number().positive("Voer een positief bedrag in"),
  description: z.string().min(1, "Verplicht"),
  date: z.string().min(1, "Verplicht"),
});

type CreateForm = z.infer<typeof createSchema>;

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const cardItem = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

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

export function FinancePage() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data: payments, isLoading } = usePayments();
  const createMutation = useCreatePayment();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<CreateForm>({
      resolver: zodResolver(createSchema),
      defaultValues: { date: new Date().toISOString().split("T")[0] },
    });

  async function onCreate(values: CreateForm) {
    await createMutation.mutateAsync(values);
    reset({ date: new Date().toISOString().split("T")[0] });
    setCreateOpen(false);
  }

  if (isLoading) {
    return <div className="flex justify-center py-24"><LoadingSpinner /></div>;
  }

  // Totals per person
  const totals: Record<string, number> = {};
  for (const p of payments ?? []) {
    totals[p.paid_by] = (totals[p.paid_by] ?? 0) + p.amount;
  }
  const totalAll = Object.values(totals).reduce((s, n) => s + n, 0);
  const personCount = Object.keys(totals).length;

  return (
    <div className="space-y-5">
      {/* Hero total card */}
      {totalAll > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative overflow-hidden rounded-3xl gradient-hero shadow-hero p-6">
            <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-sky-400/10" />
            <div className="pointer-events-none absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-white/5" />

            <div className="relative">
              <div className="mb-1 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-400/20">
                  <Wallet size={16} className="text-sky-300" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-sky-300">
                  Totaal uitgegeven
                </span>
              </div>
              <div className="text-4xl font-black text-white mt-2">{formatCurrency(totalAll)}</div>

              {personCount > 1 && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {Object.entries(totals).map(([name, amount]) => (
                    <div key={name} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 backdrop-blur-sm border border-white/10">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-xs font-black text-white ${personColor(name)}`}>
                        {name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{name}</p>
                        <p className="text-xs text-sky-200 font-bold">{formatCurrency(amount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {personCount > 1 && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-sky-300/80">
                  <TrendingUp size={12} />
                  <span>Per persoon: {formatCurrency(totalAll / personCount)}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      <Button variant="secondary" className="w-full" onClick={() => setCreateOpen(true)}>
        <Plus size={16} />
        Betaling toevoegen
      </Button>

      {(payments ?? []).length === 0 ? (
        <EmptyState
          icon={<Wallet size={36} />}
          title="Geen uitgaven"
          description="Voeg de eerste betaling toe om de groepskas bij te houden."
        />
      ) : (
        <motion.div className="space-y-2" variants={container} initial="hidden" animate="show">
          {(payments ?? []).map((payment) => (
            <motion.div key={payment.row_number} variants={cardItem}>
              <div className="card-surface rounded-2xl overflow-hidden">
                <div className="flex items-center gap-4 px-4 py-4">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-black text-white ${personColor(payment.paid_by)}`}>
                    {payment.paid_by[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">
                      {payment.description}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <User size={10} />
                        {payment.paid_by}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Calendar size={10} />
                        {formatDate(payment.date)}
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 text-base font-black text-slate-800">
                    {formatCurrency(payment.amount)}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Betaling toevoegen" description="Registreer een groepsuitgave">
        <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Betaald door</label>
            <input className="input-field" placeholder="Naam" {...register("paid_by")} />
            {errors.paid_by && <p className="mt-1.5 text-xs text-rose-500">{errors.paid_by.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Bedrag (€)</label>
              <input type="number" step="0.01" min="0" className="input-field" placeholder="0,00" {...register("amount")} />
              {errors.amount && <p className="mt-1.5 text-xs text-rose-500">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Datum</label>
              <input type="date" className="input-field" {...register("date")} />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Omschrijving</label>
            <input className="input-field" placeholder="Bijv. Parkeerkosten Jaarbeurs" {...register("description")} />
            {errors.description && <p className="mt-1.5 text-xs text-rose-500">{errors.description.message}</p>}
          </div>

          <Button type="submit" loading={isSubmitting} className="w-full">
            Betaling opslaan
          </Button>
        </form>
      </Modal>
    </div>
  );
}
