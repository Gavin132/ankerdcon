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
  pending:   { label: "Openstaand", pill: "bg-amber-500/10 text-amber-400 border border-amber-500/20",   dot: "bg-amber-400" },
  claimed:   { label: "Geclaimd",   pill: "bg-sky-500/10 text-sky-400 border border-sky-500/20",         dot: "bg-sky-400"   },
  confirmed: { label: "Bevestigd",  pill: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", dot: "bg-emerald-400" },
} as const;

function StatusBadge({ status }: { status: ExpenseShare["status"] }) {
  const { label, pill } = STATUS_CONFIG[status];
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${pill}`}>{label}</span>;
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
            className={`h-6 w-6 rounded-full border flex items-center justify-center text-[9px] font-bold transition-colors disabled:opacity-50 ${
              active
                ? STATUS_CONFIG[s].pill
                : "border-white/[0.1] text-slate-500 hover:text-slate-300 hover:border-white/[0.2]"
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
    <div className="flex items-center gap-3 py-2.5 px-4 border-t border-white/[0.05]">
      <div className="flex-1 min-w-0">
        <span className="text-sm text-slate-300 truncate">{share.expenseDescription}</span>
      </div>
      <span className="text-sm font-medium text-white shrink-0">{fmt(share.amount, share.currency)}</span>
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
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
      >
        <UserAvatar name={person.name} className="h-8 w-8 text-[11px] shrink-0" />

        <span className="flex-1 text-sm font-medium text-white">{person.name}</span>

        {/* Status breakdown */}
        <div className="flex items-center gap-2 text-xs shrink-0">
          {person.pending > 0 && (
            <span className="flex items-center gap-1 text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              {fmt(person.pending)}
            </span>
          )}
          {person.claimed > 0 && (
            <span className="flex items-center gap-1 text-sky-400">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              {fmt(person.claimed)}
            </span>
          )}
          {outstanding === 0 && person.confirmed > 0 && (
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 size={11} />
              Vereffend
            </span>
          )}
        </div>

        <span className="w-20 text-right text-sm font-semibold text-white">{fmt(total)}</span>
        {open ? <ChevronUp size={14} className="text-slate-500 shrink-0" /> : <ChevronDown size={14} className="text-slate-500 shrink-0" />}
      </button>

      {open && (
        <div className="bg-white/[0.02]">
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
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-white truncate">{expense.description}</span>
            <span className="text-xs text-slate-500">{formatDate(expense.date)}</span>
            {linkedEvent && (
              <span className="rounded-full bg-violet-500/15 border border-violet-500/25 px-2 py-0.5 text-[10px] font-semibold text-violet-300 truncate max-w-[160px]">
                {linkedEvent.event_name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-slate-400">
              Betaald door <span className="text-slate-300">{expense.paid_by}</span>
            </span>
            <span className="text-xs text-slate-600">·</span>
            <span className="text-xs font-semibold text-white">{fmt(expense.amount, expense.currency)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {pendingCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-400">
              <AlertCircle size={12} />{pendingCount}
            </span>
          )}
          {claimedCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-sky-400">
              <Clock size={12} />{claimedCount}
            </span>
          )}
          {confirmedCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <CheckCircle2 size={12} />{confirmedCount}
            </span>
          )}
          {open ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-white/[0.07] bg-white/[0.02]">
          {/* Admin controls: event link + delete */}
          <div
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.05]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 shrink-0">Evenement</span>
              <select
                value={expense.linked_event_id ?? ""}
                onChange={(e) => onSetEvent(expense.id, e.target.value || null)}
                className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-slate-200 max-w-[220px]"
              >
                <option value="">Geen evenement</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.event_name}</option>
                ))}
              </select>
            </div>

            {confirmDeleteId === expense.id ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Verwijderen?</span>
                <button
                  onClick={() => onConfirmDelete(expense.id)}
                  disabled={isDeleting}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 disabled:opacity-50 transition-colors"
                >
                  {isDeleting ? "…" : "Ja"}
                </button>
                <button
                  onClick={onCancelDelete}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white/[0.06] text-slate-400 hover:bg-white/[0.1] transition-colors"
                >
                  Nee
                </button>
              </div>
            ) : (
              <button
                onClick={() => onRequestDelete(expense.id)}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
              >
                <Trash2 size={12} />
                Verwijderen
              </button>
            )}
          </div>

          {filteredShares.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500">Geen aandelen voor dit filter.</p>
          ) : (
            <>
              <div className="flex items-center gap-3 px-4 py-2">
                <span className="flex-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Deelnemer</span>
                <span className="w-24 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Bedrag</span>
                <span className="w-28 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Status</span>
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
    <div className="flex items-center gap-3 py-2 px-4 border-t border-white/[0.05] first:border-t-0">
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <UserAvatar name={share.participant} className="h-5 w-5 text-[8px] shrink-0" />
        <span className="text-sm text-slate-300 truncate">{share.participant}</span>
      </div>
      <span className="w-24 shrink-0 text-sm font-medium text-white">{fmt(share.amount)}</span>
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
  { key: "all",       label: "Alles",       activeClass: "bg-slate-600 text-white border-slate-500" },
  { key: "pending",   label: "Openstaand",  activeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  { key: "claimed",   label: "Geclaimd",    activeClass: "bg-sky-500/20 text-sky-300 border-sky-500/40" },
  { key: "confirmed", label: "Bevestigd",   activeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
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
    <div className="p-5 lg:p-8 max-w-6xl mx-auto space-y-6">
      <AdminPageHeader title="Betalingen" subtitle="Uitgaven & aandelen" />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={14} className="text-amber-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/70">Openstaand</span>
          </div>
          <p className="text-xl font-bold text-white">{fmt(totals.pending)}</p>
        </div>
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.05] p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className="text-sky-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-400/70">Geclaimd</span>
          </div>
          <p className="text-xl font-bold text-white">{fmt(totals.claimed)}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/70">Bevestigd</span>
          </div>
          <p className="text-xl font-bold text-white">{fmt(totals.confirmed)}</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status chips */}
        {STATUS_CHIPS.map(({ key, label, activeClass }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === key
                ? activeClass
                : "border-white/[0.1] text-slate-400 hover:text-slate-300 hover:border-white/[0.2]"
            }`}
          >
            {label}
          </button>
        ))}

        {/* Divider */}
        {expenses.length > 0 && (
          <span className="h-4 w-px bg-white/[0.1] mx-1" />
        )}

        {/* Expense filter chips */}
        {expenses.map((e) => (
          <button
            key={e.id}
            onClick={() => setExpenseFilter(expenseFilter === e.id ? null : e.id)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              expenseFilter === e.id
                ? "bg-violet-500/20 text-violet-300 border-violet-500/40"
                : "border-white/[0.1] text-slate-400 hover:text-slate-300 hover:border-white/[0.2]"
            }`}
          >
            {e.description}
          </button>
        ))}

        {/* Clear active expense filter */}
        {expenseFilter && (
          <button
            onClick={() => setExpenseFilter(null)}
            className="flex items-center gap-1 rounded-full border border-white/[0.1] px-2.5 py-1 text-xs text-slate-400 hover:text-slate-300 transition-colors"
          >
            <X size={10} />
            Wis filter
          </button>
        )}
      </div>

      {/* Active expense context banner */}
      {selectedExpense && (
        <div className="flex items-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/[0.05] px-4 py-2.5 text-sm">
          <span className="text-violet-300 font-medium">{selectedExpense.description}</span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-400">{fmt(selectedExpense.amount, selectedExpense.currency)}</span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-400">Betaald door {selectedExpense.paid_by}</span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-500">{formatDate(selectedExpense.date)}</span>
        </div>
      )}

      {/* Per-person section */}
      {personData.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
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
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Openstaande uitgaven ({openExpenses.length})
        </p>

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-white/[0.03] border border-white/[0.07] animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && expenses.length === 0 && (
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-8 text-center text-sm text-slate-500">
            Geen uitgaven gevonden.
          </div>
        )}

        {!isLoading && expenses.length > 0 && openExpenses.length === 0 && (
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-8 text-center text-sm text-slate-500">
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
            className="flex w-full items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-left hover:bg-white/[0.04] transition-colors"
          >
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <History size={13} />
              Geschiedenis ({historyExpenses.length})
            </span>
            {historyOpen ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
          </button>

          {historyOpen && (
            <div className="space-y-4">
              {historyGroups.map((group) => (
                <div key={group.label} className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-400/70">
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
