import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Equal, Tag, SlidersHorizontal, X, Plus } from "lucide-react";
import { Drawer } from "../common/Drawer";
import { Button } from "../common/Button";
import { NamePicker } from "../common/NamePicker";
import { EventPicker } from "../common/EventPicker";
import { useCalendar } from "../../hooks/useCalendar";
import { UserAvatar } from "../common/UserAvatar";
import { useCreateExpense } from "../../hooks/useExpenses";
import { useUsers, useActingPermissions } from "../../hooks/useUsers";
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
  linked_event_id: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const ERR = "mt-1.5 text-xs text-rose-600 dark:text-rose-400";

const CURRENCIES = ["EUR", "USD", "GBP", "JPY"] as const;

type SplitMode = "gelijk" | "vast" | "handmatig";

const SPLIT_MODES: { id: SplitMode; label: string; icon: React.ReactNode }[] = [
  { id: "gelijk",    label: "Gelijk",    icon: <Equal           size={13} /> },
  { id: "vast",      label: "Vast",      icon: <Tag             size={13} /> },
  { id: "handmatig", label: "Handmatig", icon: <SlidersHorizontal size={13} /> },
];

const SL = "mb-1.5 block text-[12.5px] font-semibold text-ink-2";
const SF = "space-y-3 rounded-xl border-1.5 border-line bg-surface p-4";
const ST = "section-label";

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onClose: () => void;
  me: string | undefined;
  /** Preselected event day — e.g. the first day of the trip Financiën is filtered to. */
  defaultEventId?: string;
}

export function CreateExpenseDrawer({ open, onClose, me, defaultEventId }: Props) {
  const { data: users = [] } = useUsers();
  const { actable } = useActingPermissions();
  const { data: events = [] } = useCalendar();
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
      linked_event_id: defaultEventId ?? "",
    },
  });

  // The drawer stays mounted, so pick up the current trip filter each time it opens.
  useEffect(() => {
    if (open) setValue("linked_event_id", defaultEventId ?? "");
  }, [open, defaultEventId, setValue]);

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
    reset({ date: new Date().toISOString().split("T")[0], currency: "EUR", paid_by: me ?? "", linked_event_id: "" });
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
        linked_event_id: values.linked_event_id || undefined,
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
    <Button type="submit" form="create-expense-form" loading={isSubmitting} disabled={!splitValid} className="w-full">
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
              options={actable(userNames)}
              value={watch("paid_by") ?? ""}
              onChange={(name) => setValue("paid_by", name, { shouldValidate: true })}
              color="sky"
              placeholder="Zoek naam…"
            />
            {errors.paid_by && <p className={ERR}>{errors.paid_by.message}</p>}
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
              {errors.amount && <p className={ERR}>{errors.amount.message}</p>}
            </div>
            {/* Date */}
            <div>
              <label className={SL}>Datum</label>
              <input type="date" className="input-field" {...register("date")} />
            </div>
          </div>
        </div>

        {/* ── Event ───────────────────────────────────────── */}
        <div className={SF}>
          <p className={ST}>Event (optioneel)</p>
          <div>
            <EventPicker
              events={events}
              value={watch("linked_event_id") || undefined}
              onChange={(id) => setValue("linked_event_id", id ?? "", { shouldDirty: true })}
              placeholder="Hoort bij een event? Zoek en koppel…"
            />
            <p className="mt-1.5 text-xs text-ink-3">
              Dan staat de uitgave ook bij de uitgaven van die trip.
            </p>
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
            {errors.description && <p className={ERR}>{errors.description.message}</p>}
          </div>
        </div>

        {/* ── Verdeling ─────────────────────────────────────── */}
        <div className={SF}>
          <p className={ST}>Verdeling (optioneel)</p>

          {/* Mode tabs */}
          <div className="flex gap-1 rounded-[10px] border-1.5 border-line bg-sunken p-[3px]">
            {SPLIT_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSplitMode(m.id)}
                aria-pressed={splitMode === m.id}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-[7px] px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                  splitMode === m.id
                    ? "bg-surface text-ink shadow-[0_0_0_1.5px_rgb(var(--outline))]"
                    : "text-ink-2 hover:text-ink"
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
                <div className="rounded-xl bg-sunken px-3 py-2.5">
                  <p className="font-mono text-[12px] tabular-nums text-ink-2">
                    {formatAmount(totalAmount, currency)} ÷ {splitParticipants.length} = {" "}
                    <span className="font-semibold text-ink">
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
                <div className={`rounded-xl px-3 py-2.5 ${
                  Math.abs(remaining) < 0.01
                    ? "bg-emerald-100 dark:bg-emerald-500/15"
                    : "bg-amber-100 dark:bg-amber-500/15"
                }`}>
                  <p className={`font-mono text-[12px] font-semibold tabular-nums ${
                    Math.abs(remaining) < 0.01 ? "text-emerald-700 dark:text-emerald-300" : "text-amber-800 dark:text-amber-300"
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
                    <div key={i} className="flex items-center gap-2 rounded-xl border-1.5 border-line bg-surface px-3 py-2">
                      <UserAvatar
                        name={row.participant}
                        user={resolveUser(row.participant)}
                        className="h-6 w-6 text-[9px] shrink-0"
                      />
                      <span className="flex-1 truncate text-[13px] font-semibold text-ink">
                        {row.participant}
                      </span>
                      <span className="shrink-0 font-mono text-[13px] font-semibold tabular-nums text-ink">
                        {formatAmount(row.amount, currency)}
                      </span>
                      <button type="button" onClick={() => removeManualRow(i)} className="ml-1 flex h-7 w-7 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-500/15 dark:hover:text-rose-300">
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                  {/* Running total */}
                  <div className={`rounded-xl px-3 py-2 ${
                    Math.abs(remaining) < 0.01
                      ? "bg-emerald-100 dark:bg-emerald-500/15"
                      : "bg-sunken"
                  }`}>
                    <p className={`font-mono text-[12px] font-semibold tabular-nums ${Math.abs(remaining) < 0.01 ? "text-emerald-700 dark:text-emerald-300" : "text-ink-2"}`}>
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
                      className="btn-primary w-12 shrink-0 disabled:cursor-not-allowed disabled:opacity-40"
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
