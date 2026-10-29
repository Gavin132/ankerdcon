import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { TripSheet } from "../trip/TripSheet";
import { Button } from "../common/Button";
import { UserAvatar } from "../common/UserAvatar";
import { useRideCosts, useSetRideCost } from "../../hooks/useRideCosts";
import { useUsers } from "../../hooks/useUsers";
import { toast } from "../../store/toast.store";
import { formatAmount } from "../../utils/format";

/** "22,86": how an amount is typed into a payment request. */
const asTyped = (amount: number) => amount.toFixed(2).replace(".", ",");

const parseNumber = (text: string): number | null => {
  const n = Number(text.replace(",", ".").trim());
  return Number.isFinite(n) && n > 0 ? n : null;
};

const toText = (n?: number | null) => (n ? String(n).replace(".", ",") : "");

/**
 * Ritkosten for one trip, from the driver's side: what the trip cost them, who went to the trip
 * in their car and so shares it, and what each of them owes. An overview only: nothing is booked,
 * and settling up happens outside the app.
 */
export function RideCostSheet({ tripId, tripTitle, onClose }: { tripId: string | null; tripTitle: string; onClose: () => void }) {
  const { data } = useRideCosts();
  const { data: users = [] } = useUsers();
  const setCost = useSetRideCost();

  const sheet = tripId ? data?.as_driver.find((s) => s.trip_id === tripId) : undefined;
  const open = !!sheet;
  const [text, setText] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setText(toText(sheet?.amount));
    // Only when another trip opens, not on every refresh of the same one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, open]);

  if (!sheet || !tripId) {
    return <TripSheet open={false} onClose={onClose} title="Ritkosten">{null}</TripSheet>;
  }

  const amount = parseNumber(text);
  const dirty = (sheet.amount || null) !== amount;
  const resolve = (name: string) => users.find((u) => u.name === name || u.discord_username === name || u.aliases?.includes(name));
  const share = sheet.passengers[0]?.amount;

  async function save() {
    try {
      await setCost.mutateAsync({ tripId: tripId!, amount });
      toast("success", amount ? "Bedrag opgeslagen." : "Bedrag verwijderd.");
    } catch {
      toast("error", "Kon het bedrag niet opslaan. Probeer opnieuw.");
    }
  }

  async function copy(name: string, value: number) {
    try {
      await navigator.clipboard.writeText(asTyped(value));
      setCopied(name);
      window.setTimeout(() => setCopied((c) => (c === name ? null : c)), 1800);
    } catch {
      toast("error", "Kopiëren lukte niet. Het bedrag staat ernaast.");
    }
  }

  return (
    <TripSheet open={open} onClose={onClose} title="Ritkosten" subtitle={tripTitle}>
      <div className="space-y-6">
        <section className="space-y-2">
          <label htmlFor="ride-cost-amount" className="section-label block">Wat kostte het rijden?</label>
          <div className="relative">
            <span aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3">€</span>
            <input
              id="ride-cost-amount"
              inputMode="decimal"
              placeholder="0,00"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && dirty && void save()}
              className="input-field pl-8"
            />
          </div>
          <p className="text-xs leading-snug text-ink-3">
            Alles bij elkaar voor deze hele trip: brandstof, tol en parkeren. Het wordt gedeeld door jou en iedereen die op
            zijn eerste heenrit bij jou in de auto zat. Wie later in een andere auto zat, betaalt nog steeds alleen de
            chauffeur van zijn eerste heenrit.
          </p>
          <Button onClick={save} loading={setCost.isPending} disabled={!dirty} className="w-full">
            <Check size={15} /> Opslaan
          </Button>
        </section>

        <section className="space-y-2.5">
          <p className="section-label">Wie deelt mee</p>
          {sheet.group.length === 0 ? (
            <p className="text-xs text-ink-3">
              Niemand zat op zijn eerste heenrit bij jou in de auto, dus er is niemand om iets te vragen. Je kosten blijven bij jou.
            </p>
          ) : !sheet.amount ? (
            <>
              <ul className="card-surface divide-y divide-line overflow-hidden">
                {sheet.group.map((name) => (
                  <li key={name} className="flex items-center gap-3 px-3.5 py-3">
                    <UserAvatar name={name} user={resolve(name)} className="h-8 w-8 shrink-0 text-[12px]" />
                    <p className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">{name}</p>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-ink-3">Vul hierboven in wat het rijden kostte om te zien wat je kunt vragen.</p>
            </>
          ) : sheet.passengers.length === 0 ? (
            <p className="text-xs text-ink-3">Het bedrag is te klein om te delen: het blijft bij jou.</p>
          ) : (
            <>
              <ul className="card-surface divide-y divide-line overflow-hidden">
                {sheet.passengers.map((p) => (
                  <li key={p.name} className="flex items-center gap-3 px-3.5 py-3">
                    <UserAvatar name={p.name} user={resolve(p.name)} className="h-8 w-8 shrink-0 text-[12px]" />
                    <p className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">{p.name}</p>
                    <span className="font-mono text-[14px] font-semibold tabular-nums text-ink">{formatAmount(p.amount)}</span>
                    <button
                      type="button"
                      onClick={() => void copy(p.name, p.amount)}
                      aria-label={`Kopieer ${asTyped(p.amount)} voor ${p.name}`}
                      title="Bedrag kopiëren"
                      className="hit-area flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
                    >
                      {copied === p.name ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="text-xs leading-snug text-ink-3">
                {formatAmount(sheet.amount)} gedeeld door {sheet.group.length + 1} personen ({formatAmount(share ?? 0)} per
                persoon). Totaal te ontvangen {formatAmount(sheet.passengers.reduce((s, p) => s + p.amount, 0))}; jouw eigen deel is{" "}
                {formatAmount(sheet.own_share ?? 0)}. Vraag het via een Tikkie of een betaalverzoek; hier wordt niets afgeboekt.
              </p>
            </>
          )}
        </section>
      </div>
    </TripSheet>
  );
}
