import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Equal, Tag, SlidersHorizontal, X, Plus } from "lucide-react";
import { Drawer } from "../common/Drawer";
import { Button } from "../common/Button";
import { NamePicker } from "../common/NamePicker";
import { UserAvatar } from "../common/UserAvatar";
import { useCreateExpense } from "../../hooks/useExpenses";
import { useUsers } from "../../hooks/useUsers";
import { formatAmount } from "../../utils/format";
import { toast } from "../../store/toast.store";
import type { CreateExpenseShareInput, User } from "../../types";

// ── Form schema ───────────────────────────────────────────────────────────────
const schema = z.object({
  paid_by:     z.string().min(1, "Verplicht"),
  amount:      z.coerce.number().positive("Voer een positief bedrag in"),
  currency:    z.string().min(1),
  description: z.string().min(1, "Verplicht"),
  date:        z.string().min(1, "Verplicht"),
});
type FormValues = z.infer<typeof schema>;

const CURRENCIES = ["EUR", "USD", "GBP", "JPY"] as const;

type SplitMode = "gelijk" | "vast" | "handmatig";

const SPLIT_MODES: { id: SplitMode; label: string; icon: React.ReactNode }[] = [
  { id: "gelijk",    label: "Gelijk",    icon: <Equal           size={13} /> },
  { id: "vast",      label: "Vast",      icon: <Tag             size={13} /> },
  { id: "handmatig", label: "Handmatig", icon: <SlidersHorizontal size={13} /> },
];

const SL = "block text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5";
const SF = "space-y-4 rounded-2xl border border-slate-100 dark:border-white/[0.07] bg-slate-50 dark:bg-white/[0.03] p-4";
const ST = "text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3";

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onClose: () => void;
  me: string | undefined;
}

export function CreateExpenseDrawer({ open, onClose, me }: Props) {
  const { data: users = [] } = useUsers();
  const userNames = users.map((u: User) => u.name);

  const createMutation = useCreateExpense();

  // ── Split state ───────────────────────────────────────────────
  const [splitMode, setSplitMode]             = useState<SplitMode>("gelijk");
  // gelijk / vast
  const [splitParticipants, setSplitParticipants] = useState<string[]>([]);
  const [fixedAmountStr, setFixedAmountStr]       = useState("");
  // handmatig
  const [manualRows, setManualRows]           = useState<{ participant: string; amount: number }[]>([]);
  const [manualName, setManualName]           = useState("");
  const [manualAmountStr, setManualAmountStr] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date:     new Date().toISOString().split("T")[0],
      currency: "EUR",
      paid_by:  me ?? "",
    },
  });

  const totalAmount = Number(watch("amount")) || 0;
  const currency    = watch("currency") || "EUR";

  // ── Computed shares ───────────────────────────────────────────
  function buildShares(): CreateExpenseShareInput[] {
    if (splitMode === "gelijk") {
      if (splitParticipants.length === 0) return [];
      const each = totalAmount / splitParticipants.length;
      return splitParticipants.map((p) => ({ participant: p, amount: Math.round(each * 100) / 100 }));
    }
    if (splitMode === "vast") {
      const fixed = parseFloat(fixedAmountStr);
      if (splitParticipants.length === 0 || isNaN(fixed) || fixed <= 0) return [];
      return splitParticipants.map((p) => ({ participant: p, amount: fixed }));
    }
    return manualRows;
  }

  const shares     = buildShares();
  const sharesSum  = shares.reduce((s, r) => s + r.amount, 0);
  const remaining  = Math.round((totalAmount - sharesSum) * 100) / 100;
  const splitValid = shares.length > 0;

  // ── Actions ───────────────────────────────────────────────────
  function addManualRow() {
    const amt = parseFloat(manualAmountStr);
    if (!manualName || isNaN(amt) || amt <= 0) return;
    setManualRows((prev) => [...prev, { participant: manualName, amount: amt }]);
    setManualName("");
    setManualAmountStr("");
  }

  function removeManualRow(i: number) {
    setManualRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleClose() {
    onClose();
    reset({ date: new Date().toISOString().split("T")[0], currency: "EUR", paid_by: me ?? "" });
    setSplitMode("gelijk");
    setSplitParticipants([]);
    setFixedAmountStr("");
    setManualRows([]);
    setManualName("");
    setManualAmountStr("");
  }

  async function onSubmit(values: FormValues) {
    try {
      await createMutation.mutateAsync({
        ...values,
        shares: buildShares(),
      });
      toast("success", `"${values.description}" toegevoegd!`);
      handleClose();
    } catch {
      toast("error", "Kon de uitgave niet opslaan. Probeer opnieuw.");
    }
  }

  // ── Helpers ───────────────────────────────────────────────────
  function resolveUser(name: string) {
    return users.find((u: User) => u.name === name || u.discord_username === name || u.aliases?.includes(name));
  }

  const manualUsedNames = new Set(manualRows.map((r) => r.participant));
  const manualAvailable = userNames.filter((n) => !manualUsedNames.has(n));

  const footer = (
    <Button type="submit" form="create-expense-form" loading={isSubmitting} className="w-full">
      Uitgave opslaan
    </Button>
  );

  return (
    <Drawer open={open} onClose={handleClose} title="Uitgave toevoegen" subtitle="Registreer een groepsuitgave" footer={footer}>
      <form id="create-expense-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* ── Betaler ───────────────────────────────────────── */}
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
            {errors.paid_by && <p className="mt-1.5 text-xs text-rose-500">{errors.paid_by.message}</p>}
          </div>
        </div>

        {/* ── Bedrag, valuta & datum ────────────────────────── */}
        <div className={SF}>
          <p className={ST}>Bedrag & datum</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Amount + currency */}
            <div>
              <label className={SL}>Bedrag</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input-field flex-1"
                  placeholder="0,00"
                  {...register("amount")}
                />
                <select
                  className="input-field w-20 shrink-0"
                  {...register("currency")}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              {errors.amount && <p className="mt-1.5 text-xs text-rose-500">{errors.amount.message}</p>}
            </div>
            {/* Date */}
            <div>
              <label className={SL}>Datum</label>
              <input type="date" className="input-field dark:[color-scheme:dark]" {...register("date")} />
            </div>
          </div>
        </div>

        {/* ── Omschrijving ──────────────────────────────────── */}
        <div className={SF}>
          <p className={ST}>Omschrijving</p>
          <div>
            <label className={SL}>Wat was het voor?</label>
            <input
              className="input-field"
              placeholder="Bijv. Parkeerkosten Jaarbeurs"
              {...register("description")}
            />
            {errors.description && <p className="mt-1.5 text-xs text-rose-500">{errors.description.message}</p>}
          </div>
        </div>

        {/* ── Verdeling ─────────────────────────────────────── */}
        <div className={SF}>
          <p className={ST}>Verdeling (optioneel)</p>

          {/* Mode tabs */}
          <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4">
            {SPLIT_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSplitMode(m.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  splitMode === m.id
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>

          {/* ── Gelijk verdeeld ── */}
          {splitMode === "gelijk" && (
            <div className="space-y-3">
              <div>
                <label className={SL}>Deelnemers</label>
                <NamePicker
                  multiple
                  options={userNames}
                  value={splitParticipants}
                  onChange={setSplitParticipants}
                  color="sky"
                  placeholder="Kies personen…"
                />
              </div>
              {splitParticipants.length > 0 && totalAmount > 0 && (
                <div className="rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 px-3 py-2.5">
                  <p className="text-[11px] font-semibold text-sky-700 dark:text-sky-400">
                    {formatAmount(totalAmount, currency)} ÷ {splitParticipants.length} = {" "}
                    <span className="font-black">
                      {formatAmount(Math.round((totalAmount / splitParticipants.length) * 100) / 100, currency)} per persoon
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Vaste prijs ── */}
          {splitMode === "vast" && (
            <div className="space-y-3">
              <div>
                <label className={SL}>Deelnemers</label>
                <NamePicker
                  multiple
                  options={userNames}
                  value={splitParticipants}
                  onChange={setSplitParticipants}
                  color="sky"
                  placeholder="Kies personen…"
                />
              </div>
              <div>
                <label className={SL}>Bedrag per persoon</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input-field"
                  placeholder="0,00"
                  value={fixedAmountStr}
                  onChange={(e) => setFixedAmountStr(e.target.value)}
                />
              </div>
              {splitParticipants.length > 0 && parseFloat(fixedAmountStr) > 0 && (
                <div className={`rounded-xl border px-3 py-2.5 ${
                  Math.abs(remaining) < 0.01
                    ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20"
                    : "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20"
                }`}>
                  <p className={`text-[11px] font-semibold ${
                    Math.abs(remaining) < 0.01 ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
                  }`}>
                    {splitParticipants.length} × {formatAmount(parseFloat(fixedAmountStr), currency)} = {formatAmount(sharesSum, currency)}
                    {Math.abs(remaining) >= 0.01 && ` · verschil: ${formatAmount(Math.abs(remaining), currency)}`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Handmatig ── */}
          {splitMode === "handmatig" && (
            <div className="space-y-3">
              {/* Existing rows */}
              {manualRows.length > 0 && (
                <div className="space-y-1.5">
                  {manualRows.map((row, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2">
                      <UserAvatar
                        name={row.participant}
                        user={resolveUser(row.participant)}
                        className="h-6 w-6 text-[9px] shrink-0"
                      />
                      <span className="flex-1 text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                        {row.participant}
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-white shrink-0">
                        {formatAmount(row.amount, currency)}
                      </span>
                      <button type="button" onClick={() => removeManualRow(i)} className="text-slate-300 hover:text-rose-400 transition-colors ml-1">
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                  {/* Running total */}
                  <div className={`rounded-xl border px-3 py-2 ${
                    Math.abs(remaining) < 0.01
                      ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20"
                      : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                  }`}>
                    <p className={`text-[11px] font-semibold ${Math.abs(remaining) < 0.01 ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>
                      Totaal: {formatAmount(sharesSum, currency)}
                      {totalAmount > 0 && Math.abs(remaining) >= 0.01 && ` · restant: ${formatAmount(remaining, currency)}`}
                      {Math.abs(remaining) < 0.01 && " · volledig verdeeld"}
                    </p>
                  </div>
                </div>
              )}

              {/* Add row */}
              <div>
                <label className={SL}>Persoon toevoegen</label>
                <div className="space-y-2">
                  <NamePicker
                    options={manualAvailable}
                    value={manualName}
                    onChange={setManualName}
                    color="sky"
                    placeholder="Kies naam…"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input-field flex-1"
                      placeholder={`Bedrag (${currency})`}
                      value={manualAmountStr}
                      onChange={(e) => setManualAmountStr(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addManualRow())}
                    />
                    <button
                      type="button"
                      onClick={addManualRow}
                      disabled={!manualName || !manualAmountStr}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-sky-600 transition-colors"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </form>
    </Drawer>
  );
}
