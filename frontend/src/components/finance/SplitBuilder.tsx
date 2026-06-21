import { useState } from "react";
import { X, UserPlus } from "lucide-react";
import { avatarColor, personInitial } from "../../utils/avatar";
import { formatCurrency } from "../../utils/format";
import { NamePicker } from "../common/NamePicker";
import { SplitBuilderProps } from "../../types/interfaces";

export function SplitBuilder({
  splits,
  onChange,
  userNames,
  totalAmount,
}: SplitBuilderProps) {
  const [names, setNames] = useState<string[]>([]);
  const [amount, setAmount] = useState("");

  const usedNames = new Set(splits.map((s) => s.name));
  const available = userNames.filter(
    (n) => !usedNames.has(n) && !names.includes(n),
  );
  const splitTotal = splits.reduce((s, x) => s + x.amount, 0);
  const remaining = Math.max(0, totalAmount - splitTotal);

  function add() {
    const amt = parseFloat(amount);
    if (names.length === 0 || isNaN(amt) || amt <= 0) return;
    onChange([...splits, ...names.map((n) => ({ name: n, amount: amt }))]);
    setNames([]);
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
          <span
            className={`text-xs font-semibold ${
              Math.abs(remaining) < 0.01 ? "text-emerald-600" : "text-amber-600"
            }`}
          >
            Restant: {formatCurrency(remaining)}
          </span>
        )}
      </div>

      {splits.length > 0 && (
        <div className="space-y-1.5">
          {splits.map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2"
            >
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-xs font-black text-white ${avatarColor(s.name)}`}
              >
                {personInitial(s.name)}
              </div>
              <span className="flex-1 text-xs font-semibold text-slate-700">
                {s.name}
              </span>
              <span className="text-xs font-bold text-slate-800">
                {formatCurrency(s.amount)}
              </span>
              <button
                onClick={() => remove(i)}
                className="text-slate-300 hover:text-rose-400 transition-colors ml-1"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <NamePicker
        multiple
        options={
          available.length > 0
            ? available
            : userNames.filter((n) => !names.includes(n))
        }
        value={names}
        onChange={setNames}
        color="sky"
        placeholder="Kies persoon(en)…"
      />
      <div className="flex gap-2">
        <input
          type="number"
          step="0.01"
          min="0"
          className="input-field flex-1 text-sm"
          placeholder="Bedrag p.p. (€)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
        />
        <button
          type="button"
          onClick={add}
          disabled={names.length === 0 || !amount}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-sky-600 transition-colors"
        >
          <UserPlus size={15} />
        </button>
      </div>
    </div>
  );
}
