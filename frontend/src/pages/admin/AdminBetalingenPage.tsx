import { useState } from "react";
import { CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp, X, Trash2, History } from "lucide-react";
import { useExpenses } from "../../hooks/useExpenses";
import { useAdminUpdateExpense, useAdminDeleteExpense, useAdminSetShareStatus } from "../../hooks/useAdmin";
import { useCalendar } from "../../hooks/useCalendar";
import { UserAvatar } from "../../components/common/UserAvatar";
import { AdminPageHeader } from "./components/AdminPageHeader";
import { toast } from "../../store/toast.store";
import type { CalendarEvent, Expense, ExpenseShare } from "../../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending:   { label: "Openstaand", pill: "border border-transparent bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",       dot: "bg-amber-500" },
  claimed:   { label: "Geclaimd",   pill: "border border-transparent bg-sunken text-ink-2",                                                   dot: "bg-ink-3"     },
  confirmed: { label: "Bevestigd",  pill: "border border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300", dot: "bg-emerald-500" },
} as const;

function StatusBadge({ status }: { status: ExpenseShare["status"] }) {
  const { label, pill } = STATUS_CONFIG[status];
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${pill}`}>{label}</span>;
}

// ── Admin status picker — lets an admin set a share to any status directly ────

const STATUS_ORDER: ExpenseShare["status"][] = ["pending", "claimed", "confirmed"];

function AdminStatusPicker({
  status,
  onSetStatus,
}: {
  status: ExpenseShare["status"];
  onSetStatus: (status: ExpenseShare["status"]) => void;
}) {
  const [pending, setPending] = useState(false);

  async function handleClick(next: ExpenseShare["status"]) {
    if (next === status || pending) return;
    setPending(true);
    try {
      await onSetStatus(next);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-1 shrink-0">
      {STATUS_ORDER.map((s) => {
        const active = s === status;
        return (
          <button
            key={s}
            type="button"
            disabled={pending}
            onClick={() => handleClick(s)}
            title={STATUS_CONFIG[s].label}
            className={`flex h-6 w-6 items-center justify-center rounded-full border font-mono text-[9.5px] font-semibold transition-colors disabled:opacity-50 ${
              active
                ? STATUS_CONFIG[s].pill
                : "border-line text-ink-3 hover:text-ink hover:border-ink-3"
            }`}
          >
            {s === "pending" ? "O" : s === "claimed" ? "G" : "B"}
          </button>
        );
      })}
    </div>
  );
}

// ── Share row inside expanded person ─────────────────────────────────────────

interface ShareWithMeta extends ExpenseShare {
  expenseDescription: string;
  expenseId: string;
  currency: string;
}

function PersonShareRow({
  share,
  onSetStatus,
}: {
  share: ShareWithMeta;
  onSetStatus: (id: string, status: ExpenseShare["status"]) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-4 border-t border-line">
      <div className="flex-1 min-w-0">
        <span className="text-sm text-ink-2 truncate">{share.expenseDescription}</span>
      </div>
      <span className="shrink-0 font-mono text-sm font-medium tabular-nums text-ink">{fmt(share.amount, share.currency)}</span>
      <StatusBadge status={share.status} />
      <AdminStatusPicker status={share.status} onSetStatus={(s) => onSetStatus(share.id, s)} />
    </div>
  );
}

// ── Per-person card ───────────────────────────────────────────────────────────

interface PersonBalance {
  name: string;
  pending: number;
  claimed: number;
  confirmed: number;
  shares: ShareWithMeta[];
}

function PersonCard({
  person,
  statusFilter,
  expenseFilter,
  onSetStatus,
}: {
  person: PersonBalance;
  statusFilter: "all" | ExpenseShare["status"];
  expenseFilter: string | null;
  onSetStatus: (id: string, status: ExpenseShare["status"]) => void;
}) {
  const [open, setOpen] = useState(false);

  const visibleShares = person.shares.filter((s) => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (expenseFilter && s.expenseId !== expenseFilter) return false;
    return true;
  });

  if (visibleShares.length === 0) return null;

  const total = person.pending + person.claimed + person.confirmed;
  const outstanding = person.pending + person.claimed;

  return (
    <div className="card-surface overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-sunken"
      >
        <UserAvatar name={person.name} className="h-8 w-8 text-[11px] shrink-0" />

        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{person.name}</span>

        {/* Status breakdown */}
        <div className="flex shrink-0 items-center gap-2 font-mono text-xs tabular-nums">
          {person.pending > 0 && (
            <span className="flex items-center gap-1 text-amber-800 dark:text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {fmt(person.pending)}
            </span>
          )}
          {person.claimed > 0 && (
            <span className="flex items-center gap-1 text-ink-2">
              <span className="h-1.5 w-1.5 rounded-full bg-ink-3" />
              {fmt(person.claimed)}
            </span>
          )}
          {outstanding === 0 && person.confirmed > 0 && (
            <span className="flex items-center gap-1 font-sans text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 size={11} />
              Vereffend
            </span>
          )}
        </div>

        <span className="w-20 text-right font-mono text-sm font-semibold tabular-nums text-ink">{fmt(total)}</span>
        {open ? <ChevronUp size={14} className="text-ink-3 shrink-0" /> : <ChevronDown size={14} className="text-ink-3 shrink-0" />}
      </button>

      {open && (
        <div className="bg-sunken/40">
          {visibleShares.map((share) => (
            <PersonShareRow key={share.id} share={share} onSetStatus={onSetStatus} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Expense card ──────────────────────────────────────────────────────────────

function ExpenseCard({
  expense,
  events,
  statusFilter,
  onSetStatus,
  onSetEvent,
  confirmDeleteId,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
  isDeleting,
}: {
  expense: Expense;
  events: CalendarEvent[];
  statusFilter: "all" | ExpenseShare["status"];
  onSetStatus: (id: string, status: ExpenseShare["status"]) => void;
  onSetEvent: (expenseId: string, eventId: string | null) => void;
  confirmDeleteId: string | null;
  onRequestDelete: (id: string) => void;
  onCancelDelete: () => void;
  onConfirmDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const [open, setOpen] = useState(false);

  const filteredShares = statusFilter === "all"
    ? expense.shares
    : expense.shares.filter((s) => s.status === statusFilter);

  if (filteredShares.length === 0 && statusFilter !== "all") return null;

  const pendingCount   = expense.shares.filter((s) => s.status === "pending").length;
  const claimedCount   = expense.shares.filter((s) => s.status === "claimed").length;
  const confirmedCount = expense.shares.filter((s) => s.status === "confirmed").length;
  const linkedEvent = expense.linked_event_id ? events.find((e) => e.id === expense.linked_event_id) : undefined;

  return (
    <div className="card-surface overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-sunken"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="truncate text-sm font-semibold text-ink">{expense.description}</span>
            <span className="whitespace-nowrap font-mono text-xs text-ink-3">{formatDate(expense.date)}</span>
            {linkedEvent && (
              <span className="max-w-[160px] truncate rounded-md border border-line px-1.5 font-mono text-[10.5px] uppercase tracking-[0.05em] text-ink-2">
                {linkedEvent.event_name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-ink-3">
              Betaald door <span className="text-ink-2">{expense.paid_by}</span>
            </span>
            <span className="text-xs text-ink-3">·</span>
            <span className="font-mono text-xs font-semibold tabular-nums text-ink">{fmt(expense.amount, expense.currency)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {pendingCount > 0 && (
            <span className="flex items-center gap-1 font-mono text-xs tabular-nums text-amber-800 dark:text-amber-300">
              <AlertCircle size={12} />{pendingCount}
            </span>
          )}
          {claimedCount > 0 && (
            <span className="flex items-center gap-1 font-mono text-xs tabular-nums text-ink-2">
              <Clock size={12} />{claimedCount}
            </span>
          )}
          {confirmedCount > 0 && (
            <span className="flex items-center gap-1 font-mono text-xs tabular-nums text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 size={12} />{confirmedCount}
            </span>
          )}
          {open ? <ChevronUp size={14} className="text-ink-3" /> : <ChevronDown size={14} className="text-ink-3" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-line bg-sunken/40">
          {/* Admin controls: event link + delete */}
          <div
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-line"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="shrink-0 font-mono text-[10.5px] uppercase tracking-[0.09em] text-ink-3">Evenement</span>
              <select
                value={expense.linked_event_id ?? ""}
                onChange={(e) => onSetEvent(expense.id, e.target.value || null)}
                className="input-field max-w-[220px] rounded-lg px-2 py-1.5 text-xs"
              >
                <option value="">Geen evenement</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.event_name}</option>
                ))}
              </select>
            </div>

            {confirmDeleteId === expense.id ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-3">Verwijderen?</span>
                <button
                  onClick={() => onConfirmDelete(expense.id)}
                  disabled={isDeleting}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25 disabled:opacity-50 transition-colors"
                >
                  {isDeleting ? "…" : "Ja"}
                </button>
                <button
                  onClick={onCancelDelete}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-sunken text-ink-2 hover:text-ink transition-colors"
                >
                  Nee
                </button>
              </div>
            ) : (
              <button
                onClick={() => onRequestDelete(expense.id)}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-3 hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-500/15 dark:hover:text-rose-300 transition-colors"
              >
                <Trash2 size={12} />
                Verwijderen
              </button>
            )}
          </div>

          {filteredShares.length === 0 ? (
            <p className="px-4 py-3 text-sm text-ink-3">Geen aandelen voor dit filter.</p>
          ) : (
            <>
              <div className="flex items-center gap-3 px-4 py-2">
                <span className="flex-1 font-mono text-[10.5px] uppercase tracking-[0.09em] text-ink-3">Deelnemer</span>
                <span className="w-24 shrink-0 font-mono text-[10.5px] uppercase tracking-[0.09em] text-ink-3">Bedrag</span>
                <span className="w-28 shrink-0 font-mono text-[10.5px] uppercase tracking-[0.09em] text-ink-3">Status</span>
                <span className="w-24 shrink-0" />
              </div>
              {filteredShares.map((share) => (
                <ShareRow key={share.id} share={share} onSetStatus={onSetStatus} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Simple share row for expense card ─────────────────────────────────────────

function ShareRow({ share, onSetStatus }: { share: ExpenseShare; onSetStatus: (id: string, status: ExpenseShare["status"]) => void }) {
  return (
    <div className="flex items-center gap-3 py-2 px-4 border-t border-line first:border-t-0">
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <UserAvatar name={share.participant} className="h-5 w-5 text-[8px] shrink-0" />
        <span className="text-sm text-ink-2 truncate">{share.participant}</span>
      </div>
      <span className="w-24 shrink-0 font-mono text-sm font-medium tabular-nums text-ink">{fmt(share.amount)}</span>
      <div className="w-28 shrink-0">
        <StatusBadge status={share.status} />
      </div>
      <div className="w-24 shrink-0 flex justify-end">
        <AdminStatusPicker status={share.status} onSetStatus={(s) => onSetStatus(share.id, s)} />
      </div>
    </div>
  );
}

// ── Build per-person data ─────────────────────────────────────────────────────

function buildPersonData(expenses: Expense[]): PersonBalance[] {
  const map = new Map<string, PersonBalance>();

  for (const expense of expenses) {
    for (const share of expense.shares) {
      const existing = map.get(share.participant) ?? {
        name: share.participant,
        pending: 0,
        claimed: 0,
        confirmed: 0,
        shares: [],
      };
      existing[share.status] += share.amount;
      existing.shares.push({
        ...share,
        expenseDescription: expense.description,
        expenseId: expense.id,
        currency: expense.currency,
      });
      map.set(share.participant, existing);
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => b.pending + b.claimed - (a.pending + a.claimed),
  );
}

// ── Filter chips ──────────────────────────────────────────────────────────────

type StatusFilter = "all" | ExpenseShare["status"];

const STATUS_CHIPS: { key: StatusFilter; label: string; activeClass: string }[] = [
  { key: "all",       label: "Alles",       activeClass: "border-transparent bg-ink text-paper dark:bg-brand dark:text-brand-on" },
  { key: "pending",   label: "Openstaand",  activeClass: "border-transparent bg-ink text-paper dark:bg-brand dark:text-brand-on" },
  { key: "claimed",   label: "Geclaimd",    activeClass: "border-transparent bg-ink text-paper dark:bg-brand dark:text-brand-on" },
  { key: "confirmed", label: "Bevestigd",   activeClass: "border-transparent bg-ink text-paper dark:bg-brand dark:text-brand-on" },
];

// ── Main page ─────────────────────────────────────────────────────────────────

function isSettled(expense: Expense): boolean {
  return expense.shares.length > 0 && expense.shares.every((s) => s.status === "confirmed");
}

export function AdminBetalingenPage() {
  const { data: expenses = [], isLoading } = useExpenses();
  const { data: events = [] } = useCalendar();
  const setShareStatus = useAdminSetShareStatus();
  const updateExpense = useAdminUpdateExpense();
  const deleteExpense = useAdminDeleteExpense();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expenseFilter, setExpenseFilter] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  async function handleSetStatus(shareId: string, status: ExpenseShare["status"]) {
    try {
      await setShareStatus.mutateAsync({ shareId, status });
      toast("success", "Status bijgewerkt.");
    } catch {
      toast("error", "Bijwerken mislukt.");
    }
  }

  async function handleSetEvent(expenseId: string, eventId: string | null) {
    try {
      await updateExpense.mutateAsync({ id: expenseId, linkedEventId: eventId });
      toast("success", "Evenement bijgewerkt.");
    } catch {
      toast("error", "Bijwerken mislukt.");
    }
  }

  async function handleDeleteExpense(expenseId: string) {
    try {
      await deleteExpense.mutateAsync(expenseId);
      toast("success", "Uitgave verwijderd.");
      setConfirmDeleteId(null);
    } catch {
      toast("error", "Verwijderen mislukt.");
    }
  }

  const totals = expenses.reduce(
    (acc, e) => {
      for (const s of e.shares) acc[s.status] += s.amount;
      return acc;
    },
    { pending: 0, claimed: 0, confirmed: 0 },
  );

  const personData = buildPersonData(expenses);
  const selectedExpense = expenseFilter ? expenses.find((e) => e.id === expenseFilter) : null;

  const scopedExpenses = expenses.filter((e) => !expenseFilter || e.id === expenseFilter);
  const openExpenses = scopedExpenses.filter((e) => !isSettled(e));
  const historyExpenses = scopedExpenses.filter(isSettled);

  const historyGroups: { label: string; expenses: Expense[] }[] = (() => {
    const map = new Map<string, Expense[]>();
    for (const expense of historyExpenses) {
      const label = expense.linked_event_id
        ? (events.find((ev) => ev.id === expense.linked_event_id)?.event_name ?? "Onbekend evenement")
        : "Geen evenement";
      const group = map.get(label);
      if (group) group.push(expense);
      else map.set(label, [expense]);
    }
    return Array.from(map.entries()).map(([label, exps]) => ({ label, expenses: exps }));
  })();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <AdminPageHeader title="Betalingen" subtitle="Uitgaven & aandelen" />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <div className="card-surface p-4">
          <div className="mb-2 flex items-center gap-2">
            <AlertCircle size={14} className="text-amber-600 dark:text-amber-400" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-3">Openstaand</span>
          </div>
          <p className="font-mono text-2xl font-semibold tabular-nums text-ink">{fmt(totals.pending)}</p>
        </div>
        <div className="card-surface p-4">
          <div className="mb-2 flex items-center gap-2">
            <Clock size={14} className="text-ink-3" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-3">Geclaimd</span>
          </div>
          <p className="font-mono text-2xl font-semibold tabular-nums text-ink">{fmt(totals.claimed)}</p>
        </div>
        <div className="card-surface p-4">
          <div className="mb-2 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-3">Bevestigd</span>
          </div>
          <p className="font-mono text-2xl font-semibold tabular-nums text-ink">{fmt(totals.confirmed)}</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status chips */}
        {STATUS_CHIPS.map(({ key, label, activeClass }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`rounded-full border-1.5 px-3 py-1 text-xs font-semibold transition-colors ${
              statusFilter === key
                ? activeClass
                : "border-line bg-surface text-ink-2 hover:border-ink-3"
            }`}
          >
            {label}
          </button>
        ))}

        {/* Divider */}
        {expenses.length > 0 && (
          <span className="mx-1 h-4 w-px bg-line" />
        )}

        {/* Expense filter chips */}
        {expenses.map((e) => (
          <button
            key={e.id}
            onClick={() => setExpenseFilter(expenseFilter === e.id ? null : e.id)}
            className={`rounded-full border-1.5 px-3 py-1 text-xs font-semibold transition-colors ${
              expenseFilter === e.id
                ? "border-transparent bg-ink text-paper dark:bg-brand dark:text-brand-on"
                : "border-line bg-surface text-ink-2 hover:border-ink-3"
            }`}
          >
            {e.description}
          </button>
        ))}

        {/* Clear active expense filter */}
        {expenseFilter && (
          <button
            onClick={() => setExpenseFilter(null)}
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
          >
            <X size={10} />
            Wis filter
          </button>
        )}
      </div>

      {/* Active expense context banner */}
      {selectedExpense && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border-1.5 border-line bg-sunken px-4 py-2.5 text-sm">
          <span className="font-semibold text-ink">{selectedExpense.description}</span>
          <span className="text-ink-3">·</span>
          <span className="text-ink-3">{fmt(selectedExpense.amount, selectedExpense.currency)}</span>
          <span className="text-ink-3">·</span>
          <span className="text-ink-3">Betaald door {selectedExpense.paid_by}</span>
          <span className="text-ink-3">·</span>
          <span className="text-ink-3">{formatDate(selectedExpense.date)}</span>
        </div>
      )}

      {/* Per-person section */}
      {personData.length > 0 && (
        <div className="space-y-2">
          <p className="section-label">
            Per persoon
          </p>
          {personData.map((person) => (
            <PersonCard
              key={person.name}
              person={person}
              statusFilter={statusFilter}
              expenseFilter={expenseFilter}
              onSetStatus={handleSetStatus}
            />
          ))}
        </div>
      )}

      {/* Open expense list */}
      <div className="space-y-2">
        <p className="section-label">
          Openstaande uitgaven ({openExpenses.length})
        </p>

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-sunken" />
            ))}
          </div>
        )}

        {!isLoading && expenses.length === 0 && (
          <div className="card-surface px-4 py-8 text-center text-sm text-ink-3">
            Geen uitgaven gevonden.
          </div>
        )}

        {!isLoading && expenses.length > 0 && openExpenses.length === 0 && (
          <div className="card-surface px-4 py-8 text-center text-sm text-ink-3">
            Alles is vereffend — check de geschiedenis hieronder.
          </div>
        )}

        {!isLoading &&
          openExpenses.map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              events={events}
              statusFilter={statusFilter}
              onSetStatus={handleSetStatus}
              onSetEvent={handleSetEvent}
              confirmDeleteId={confirmDeleteId}
              onRequestDelete={setConfirmDeleteId}
              onCancelDelete={() => setConfirmDeleteId(null)}
              onConfirmDelete={handleDeleteExpense}
              isDeleting={deleteExpense.isPending}
            />
          ))}
      </div>

      {/* History — fully settled expenses, grouped per event */}
      {!isLoading && historyExpenses.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            className="card-surface-hover flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="section-label flex items-center gap-2">
              <History size={13} />
              Geschiedenis ({historyExpenses.length})
            </span>
            {historyOpen ? <ChevronUp size={14} className="text-ink-3" /> : <ChevronDown size={14} className="text-ink-3" />}
          </button>

          {historyOpen && (
            <div className="space-y-4">
              {historyGroups.map((group) => (
                <div key={group.label} className="space-y-2">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.09em] text-ink-2">
                    {group.label}
                  </p>
                  {group.expenses.map((expense) => (
                    <ExpenseCard
                      key={expense.id}
                      expense={expense}
                      events={events}
                      statusFilter={statusFilter}
                      onSetStatus={handleSetStatus}
                      onSetEvent={handleSetEvent}
                      confirmDeleteId={confirmDeleteId}
                      onRequestDelete={setConfirmDeleteId}
                      onCancelDelete={() => setConfirmDeleteId(null)}
                      onConfirmDelete={handleDeleteExpense}
                      isDeleting={deleteExpense.isPending}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
