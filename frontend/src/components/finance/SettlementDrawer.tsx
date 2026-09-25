import { useEffect, useState } from "react";
import { Copy, Check, ExternalLink, Info } from "lucide-react";
import { Drawer } from "../common/Drawer";
import { Button } from "../common/Button";
import { UserAvatar } from "../common/UserAvatar";
import {
  useCreateSettlement,
  useMarkSettlementPaid,
  useConfirmSettlement,
  useWithdrawSettlement,
} from "../../hooks/useSettlements";
import { formatAmount, formatDate } from "../../utils/format";
import { toast } from "../../store/toast.store";
import { describeSettlement, type SettleTarget } from "./SettleUpCard";
import type { User } from "../../types";

interface Props {
  target: SettleTarget | null;
  onClose: () => void;
  users: User[];
  meId: string | undefined;
}

/** Recognisable name for a payment-request link; the host is always shown too. */
const PROVIDERS: [string, string][] = [
  ["tikkie.me", "Tikkie"],
  ["bunq.me", "bunq"],
  ["paypal.me", "PayPal"],
  ["ing.nl", "ING"],
  ["rabobank.nl", "Rabobank"],
  ["abnamro.nl", "ABN AMRO"],
  ["snsbank.nl", "SNS"],
  ["asnbank.nl", "ASN"],
  ["knab.nl", "Knab"],
  ["wero-wallet.eu", "Wero"],
];

function linkInfo(url: string): { host: string; provider?: string } | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const provider = PROVIDERS.find(([domain]) => host === domain || host.endsWith(`.${domain}`))?.[1];
    return { host, provider };
  } catch {
    return null;
  }
}

function formatIban(iban: string) {
  return iban.replace(/(.{4})/g, "$1 ").trim();
}

function errorText(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}

function CopyField({ label, value, display }: { label: string; value: string; display?: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[11.5px] font-semibold text-ink-3">{label}</p>
        <p className="truncate font-mono text-[13.5px] font-semibold tabular-nums text-ink">{display ?? value}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border-1.5 border-line px-2 py-1 text-[12px] font-semibold text-ink-2 transition-colors hover:border-ink-3 hover:text-ink"
        aria-label={`Kopieer ${label.toLowerCase()}`}
      >
        {copied ? <Check size={12} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={12} />}
        {copied ? "Gekopieerd" : "Kopieer"}
      </button>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-xl bg-sunken px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-2">
      <Info size={14} className="mt-0.5 shrink-0 text-ink-3" />
      <span>{children}</span>
    </p>
  );
}

/** Pay, request, confirm or withdraw one settle-up payment, depending on its state and your side of it. */
export function SettlementDrawer({ target, onClose, users, meId }: Props) {
  const create   = useCreateSettlement();
  const paid     = useMarkSettlementPaid();
  const confirm  = useConfirmSettlement();
  const withdraw = useWithdrawSettlement();
  const busy = create.isPending || paid.isPending || confirm.isPending || withdraw.isPending;

  const [requestUrl, setRequestUrl]   = useState("");
  const [iban, setIban]               = useState("");
  const [accountName, setAccountName] = useState("");

  const targetKey = target?.kind === "item" ? `${target.item.counterparty_id}-${target.item.currency}` : target?.settlement.id;
  useEffect(() => {
    setRequestUrl("");
    setIban("");
    setAccountName("");
  }, [targetKey]);

  if (!target) return null;

  async function run(action: () => Promise<unknown>, success: string, fallback: string) {
    try {
      await action();
      toast("success", success);
      onClose();
    } catch (err) {
      toast("error", errorText(err, fallback));
    }
  }

  // ── Who, how much ───────────────────────────────────────────────
  const settlement = target.kind === "settlement" ? target.settlement : null;
  const item       = target.kind === "item" ? target.item : null;
  const otherId    = item ? item.counterparty_id : describeSettlement(settlement!, meId).otherId;
  const otherName  = item ? item.counterparty : describeSettlement(settlement!, meId).other;
  const amount     = item ? item.amount : settlement!.amount;
  const currency   = item ? item.currency : settlement!.currency;
  const iPay       = item ? item.direction === "i_owe" : settlement!.from_user_id === meId;
  const amountStr  = amount.toFixed(2).replace(".", ",");

  let title = "";
  let subtitle = "";
  let body: React.ReactNode = null;
  let footer: React.ReactNode = null;

  const hero = (
    <div className="flex items-center justify-between gap-3 rounded-xl border-1.5 border-line bg-surface px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <UserAvatar name={otherName} user={users.find((u) => u.id === otherId)} className="h-10 w-10 shrink-0 text-sm" />
        <div className="min-w-0">
          <p className="section-label">{iPay ? "Aan" : "Van"}</p>
          <p className="truncate text-sm font-semibold text-ink">{otherName}</p>
        </div>
      </div>
      <p className="shrink-0 font-mono text-[26px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-ink">
        {formatAmount(amount, currency)}
      </p>
    </div>
  );

  // ── Nothing started yet ─────────────────────────────────────────
  if (item) {
    const covers = `${item.share_count} ${item.share_count === 1 ? "aandeel" : "aandelen"}`;
    if (item.blocked_by_settlement) {
      title = `Afrekenen met ${otherName}`;
      body = <Note>Er loopt al een afrekening met {otherName}. Rond die eerst af; daarna kun je dit bedrag verrekenen.</Note>;
    } else if (item.direction === "even") {
      title = `Quitte met ${otherName}`;
      body = <Note>Wat jullie elkaar schuldig zijn valt precies tegen elkaar weg ({covers}). Streep het weg, dan staat het niet meer open.</Note>;
      footer = (
        <Button className="w-full" loading={busy}
          onClick={() => run(() => create.mutateAsync({ counterparty_id: otherId, currency, action: "received" }), "Weggestreept.", "Kon niet wegstrepen.")}>
          Wegstrepen
        </Button>
      );
    } else if (item.direction === "i_owe") {
      title = `Betalen aan ${otherName}`;
      subtitle = `Verrekent ${covers} in één keer`;
      body = (
        <Note>
          {otherName} kan je een betaalverzoek sturen; dat komt dan hier te staan. Al betaald, via de bank of contant?
          Meld het, dan bevestigt {otherName} dat het binnen is.
        </Note>
      );
      footer = (
        <Button className="w-full" loading={busy}
          onClick={() => run(() => create.mutateAsync({ counterparty_id: otherId, currency, action: "paid" }), `Gemeld; ${otherName} bevestigt het nog.`, "Kon de betaling niet melden.")}>
          Ik heb betaald
        </Button>
      );
    } else {
      title = `Geld vragen aan ${otherName}`;
      subtitle = `Verrekent ${covers} in één keer`;
      const canSend = requestUrl.trim() !== "" || iban.trim() !== "";
      body = (
        <div className="space-y-4">
          <div className="card-surface divide-y divide-line overflow-hidden">
            <CopyField label="Bedrag" value={amountStr} display={formatAmount(amount, currency)} />
            <CopyField label="Omschrijving" value={`Ankerd afrekening ${otherName}`} />
          </div>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-ink-2" htmlFor="settle-link">Betaallink</label>
            <input
              id="settle-link"
              type="url"
              inputMode="url"
              className="input-field"
              placeholder="https://…"
              value={requestUrl}
              onChange={(e) => setRequestUrl(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-ink-3">Maak in je bank-app een betaalverzoek van {formatAmount(amount, currency)} (Tikkie, ING, Rabo, bunq, Wero…) en plak de link hier.</p>
          </div>
          <div className="flex items-center gap-3 text-[11.5px] font-semibold uppercase tracking-wide text-ink-3">
            <span className="h-px flex-1 bg-line" /> of <span className="h-px flex-1 bg-line" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-ink-2" htmlFor="settle-iban">IBAN</label>
              <input id="settle-iban" className="input-field font-mono" placeholder="NL00 BANK 0123 4567 89" autoComplete="off"
                value={iban} onChange={(e) => setIban(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-ink-2" htmlFor="settle-name">Op naam van</label>
              <input id="settle-name" className="input-field" placeholder="Naam rekeninghouder" maxLength={70}
                value={accountName} onChange={(e) => setAccountName(e.target.value)} />
            </div>
          </div>
          <Note>Alleen {otherName} ziet dit, en het wordt gewist zodra je de betaling bevestigt. Het wordt niet op je profiel bewaard.</Note>
        </div>
      );
      footer = (
        <div className="space-y-2">
          <Button className="w-full" loading={busy} disabled={!canSend}
            onClick={() => run(() => create.mutateAsync({
              counterparty_id: otherId, currency, action: "request",
              request_url: requestUrl.trim() || undefined, iban: iban.trim() || undefined, account_name: accountName.trim() || undefined,
            }), `Verzoek verstuurd naar ${otherName}.`, "Kon het verzoek niet versturen.")}>
            Verzoek sturen
          </Button>
          <Button variant="ghost" className="w-full" disabled={busy}
            onClick={() => run(() => create.mutateAsync({ counterparty_id: otherId, currency, action: "received" }), "Verrekend.", "Kon niet bijwerken.")}>
            Al ontvangen (contant)
          </Button>
        </div>
      );
    }
  }

  // ── A settlement under way (or done) ────────────────────────────
  if (settlement) {
    const s = settlement;
    const link = s.request_url ? linkInfo(s.request_url) : null;
    const d = describeSettlement(s, meId);
    title = d.title;
    subtitle = `Kenmerk ${s.payment_ref}`;
    const refField = <CopyField label="Kenmerk" value={s.payment_ref} />;

    const howToPay = (
      <div className="space-y-3">
        {s.request_url && link && (
          <a
            href={s.request_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[14px]"
          >
            <ExternalLink size={15} />
            Betalen via {link.provider ?? "betaallink"}
            <span className="font-mono text-[12px] font-medium opacity-80">({link.host})</span>
          </a>
        )}
        <div className="card-surface divide-y divide-line overflow-hidden">
          {s.iban && <CopyField label="IBAN" value={s.iban} display={formatIban(s.iban)} />}
          {s.iban && s.account_name && <CopyField label="Op naam van" value={s.account_name} />}
          <CopyField label="Bedrag" value={s.amount.toFixed(2).replace(".", ",")} display={formatAmount(s.amount, s.currency)} />
          {refField}
        </div>
      </div>
    );

    if (s.status === "confirmed") {
      body = <Note>Afgerond{s.confirmed_at ? ` op ${formatDate(s.confirmed_at)}` : ""}. Alle aandelen tussen jullie tot dat moment zijn verrekend.</Note>;
    } else if (s.status === "requested" && iPay) {
      body = (
        <div className="space-y-4">
          {howToPay}
          <Note>Controleer dat het bedrag in je bank-app {formatAmount(s.amount, s.currency)} is. Betaald? Meld het hieronder.</Note>
        </div>
      );
      footer = (
        <Button className="w-full" loading={busy}
          onClick={() => run(() => paid.mutateAsync(s.id), `Gemeld; ${d.other} bevestigt het nog.`, "Kon de betaling niet melden.")}>
          Ik heb betaald
        </Button>
      );
    } else if (s.status === "requested") {
      body = (
        <div className="space-y-4">
          <Note>
            {d.other} heeft je verzoek{link ? ` (${link.provider ?? link.host})` : ""}{s.iban ? `${link ? " en" : ""} je IBAN` : ""} gekregen.
            Zodra het geld binnen is, bevestig je het hier.
          </Note>
          <div className="card-surface overflow-hidden">{refField}</div>
        </div>
      );
      footer = (
        <div className="space-y-2">
          <Button className="w-full" loading={busy}
            onClick={() => run(() => confirm.mutateAsync(s.id), "Ontvangen — verrekend!", "Kon niet bevestigen.")}>
            Ontvangen
          </Button>
          <Button variant="ghost" className="w-full" disabled={busy}
            onClick={() => run(() => withdraw.mutateAsync(s.id), "Verzoek ingetrokken.", "Kon het verzoek niet intrekken.")}>
            Verzoek intrekken
          </Button>
        </div>
      );
    } else if (!iPay) {
      body = (
        <div className="space-y-4">
          <Note>Kijk in je bank-app of {formatAmount(s.amount, s.currency)} van {d.other} binnen is, en bevestig het dan.</Note>
          <div className="card-surface overflow-hidden">{refField}</div>
        </div>
      );
      footer = (
        <div className="space-y-2">
          <Button className="w-full" loading={busy}
            onClick={() => run(() => confirm.mutateAsync(s.id), "Ontvangen — verrekend!", "Kon niet bevestigen.")}>
            Ontvangen bevestigen
          </Button>
          <Button variant="ghost" className="w-full" disabled={busy}
            onClick={() => run(() => withdraw.mutateAsync(s.id), `${d.other} krijgt bericht dat het nog niet binnen is.`, "Kon niet bijwerken.")}>
            Niet ontvangen
          </Button>
        </div>
      );
    } else {
      body = <Note>{d.other} moet nog bevestigen dat {formatAmount(s.amount, s.currency)} binnen is.</Note>;
      footer = (
        <Button variant="ghost" className="w-full" loading={busy}
          onClick={() => run(() => withdraw.mutateAsync(s.id), "Melding ingetrokken.", "Kon niet intrekken.")}>
          Toch niet betaald — intrekken
        </Button>
      );
    }
  }

  return (
    <Drawer open={!!target} onClose={onClose} title={title} subtitle={subtitle || undefined} footer={footer ?? undefined}>
      <div className="space-y-5">
        {hero}
        {body}
      </div>
    </Drawer>
  );
}
