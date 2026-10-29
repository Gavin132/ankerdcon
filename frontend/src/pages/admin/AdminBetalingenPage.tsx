import { useState } from "react";
import { CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp, Trash2, History, Euro } from "lucide-react";
import { useExpenses } from "../../hooks/useExpenses";
import { useAdminUpdateExpense, useAdminDeleteExpense, useAdminSetShareStatus } from "../../hooks/useAdmin";
import { useCalendar } from "../../hooks/useCalendar";
import { UserAvatar } from "../../components/common/UserAvatar";
import { formatAmount, formatDateShort } from "../../utils/format";
import { AdminPage } from "./components/AdminPage";
import { AdminPageHeader } from "./components/AdminPageHeader";
import { ConfirmInline } from "./components/ConfirmInline";
import { toast } from "../../store/toast.store";
import type { CalendarEvent, Expense, ExpenseShare } from "../../types";
import { EmptyState } from "../../components/common/EmptyState";

// ── Helpers ───────────────────────────────────────────────────────────────────

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending:   { label: "Openstaand", pill: "pill-warn" },
  claimed:   { label: "Geclaimd",   pill: "pill-neutral" },
  confirmed: { label: "Bevestigd",  pill: "pill-ok" },
} as const;

function StatusBadge({ status }: { status: ExpenseShare["status"] }) {
  const { label, pill } = STATUS_CONFIG[status];
  return <span className={`pill ${pill}`}>{label}</span>;
}

// ── Admin status picker — lets an admin set a share to any status directly ────

const STATUS_ORDER: ExpenseShare["status"][] = ["pending", "claimed", "confirmed"];

function AdminStatusPicker({
  status,
  who,
  onSetStatus,
}: {
  status: ExpenseShare["status"];
  /** Whose share it is, for the screen reader. */
  who: string;
  onSetStatus: (status: ExpenseShare["status"]) => void;
}) {
  const [pending, setPending] = useState(false);

  async function handleChange(next: ExpenseShare["status"]) {
    if (next === status || pending) return;
    setPending(true);
    try {
      await onSetStatus(next);
    } finally {
      setPending(false);
    }
  }

  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) => handleChange(e.target.value as ExpenseShare["status"])}
      aria-label={`Status van ${who}`}
      className="input-field !w-auto min-w-0"
    >
      {STATUS_ORDER.map((s) => (
        <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
      ))}
    </select>
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
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 border-t border-line px-4 py-2.5 sm:flex">
      <div className="min-w-0 sm:flex-1">
        <span className="block truncate text-sm text-ink-2">{share.expenseDescription}</span>
      </div>
      <span className="shrink-0 text-right font-mono text-sm font-medium tabular-nums text-ink">{formatAmount(share.amount, share.currency)}</span>
      <div><StatusBadge status={share.status} /></div>
      <div className="flex justify-end"><AdminStatusPicker status={share.status} who={share.expenseDescription} onSetStatus={(s) => onSetStatus(share.id, s)} /></div>
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
        <UserAvatar name={person.name} className="h-8 w-8 text-[12px] shrink-0" />

        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{person.name}</span>

        {/* Status breakdown */}
        <div className="hidden shrink-0 items-center gap-2 font-mono text-xs tabular-nums min-[380px]:flex">
          {person.pending > 0 && (
            <span className="flex items-center gap-1 text-warn">
              <span className="h-1.5 w-1.5 rounded-full bg-warn" />
              {formatAmount(person.pending)}
            </span>
          )}
          {person.claimed > 0 && (
            <span className="flex items-center gap-1 text-ink-2">
              <span className="h-1.5 w-1.5 rounded-full bg-ink-3" />
              {formatAmount(person.claimed)}
            </span>
          )}
          {outstanding === 0 && person.confirmed > 0 && (
            <span className="flex items-center gap-1 font-sans text-ok">
              <CheckCircle2 size={14} />
              Verrekend
            </span>
          )}
        </div>

        <span className="w-20 text-right font-mono text-sm font-semibold tabular-nums text-ink">{formatAmount(total)}</span>
        {open ? <ChevronUp size={16} className="text-ink-3 shrink-0" /> : <ChevronDown size={16} className="text-ink-3 shrink-0" />}
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
            <span className="whitespace-nowrap font-mono text-xs text-ink-3">{formatDateShort(expense.date)}</span>
            {linkedEvent && (
              <span className="tag max-w-[160px] truncate">
                {linkedEvent.event_name}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2">
            <span className="whitespace-nowrap text-xs text-ink-3">
              Betaald door <span className="text-ink-2">{expense.paid_by}</span>
            </span>
            <span className="text-xs text-ink-3">·</span>
            <span className="font-mono text-xs font-semibold tabular-nums text-ink">{formatAmount(expense.amount, expense.currency)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {pendingCount > 0 && (
            <span className="flex items-center gap-1 font-mono text-xs tabular-nums text-warn">
              <AlertCircle size={14} />{pendingCount}
            </span>
          )}
          {claimedCount > 0 && (
            <span className="flex items-center gap-1 font-mono text-xs tabular-nums text-ink-2">
              <Clock size={14} />{claimedCount}
            </span>
          )}
          {confirmedCount > 0 && (
            <span className="flex items-center gap-1 font-mono text-xs tabular-nums text-ok">
              <CheckCircle2 size={14} />{confirmedCount}
            </span>
          )}
          {open ? <ChevronUp size={16} className="text-ink-3" /> : <ChevronDown size={16} className="text-ink-3" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-line bg-sunken/40">
          {/* Admin controls: event link + delete */}
          <div
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-line"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="label-quiet shrink-0">Evenement</span>
              <select
                value={expense.linked_event_id ?? ""}
                onChange={(e) => onSetEvent(expense.id, e.target.value || null)}
                aria-label="Evenement van deze uitgave"
                className="input-field !w-auto max-w-[220px]"
              >
                <option value="">Geen evenement</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.event_name}</option>
                ))}
              </select>
            </div>

            {confirmDeleteId === expense.id ? (
              <ConfirmInline isPending={isDeleting} onConfirm={() => onConfirmDelete(expense.id)} onCancel={onCancelDelete} />
            ) : (
              <button
                onClick={() => onRequestDelete(expense.id)}
                className="btn-danger-soft px-3 text-sm"
              >
                <Trash2 size={16} />
                Verwijderen
              </button>
            )}
          </div>

          {filteredShares.length === 0 ? (
            <p className="px-4 py-3 text-sm text-ink-3">Geen aandelen voor dit filter.</p>
          ) : (
            <>
              <div className="hidden items-center gap-3 px-4 py-2 sm:flex">
                <span className="label-quiet flex-1">Deelnemer</span>
                <span className="label-quiet w-24 shrink-0">Bedrag</span>
                <span className="label-quiet w-28 shrink-0">Status</span>
                <span className="w-40 shrink-0" />
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
    // On a phone two lines (who and how much; status and the picker), from `sm` one line with fixed columns.
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 border-t border-line px-4 py-2 first:border-t-0 sm:flex">
      <div className="flex min-w-0 items-center gap-2 sm:flex-1">
        <UserAvatar name={share.participant} className="h-5 w-5 text-[8px] shrink-0" />
        <span className="truncate text-sm text-ink-2">{share.participant}</span>
      </div>
      <span className="shrink-0 text-right font-mono text-sm font-medium tabular-nums text-ink sm:w-24 sm:text-left">{formatAmount(share.amount)}</span>
      <div className="sm:w-28 sm:shrink-0">
        <StatusBadge status={share.status} />
      </div>
      <div className="flex justify-end sm:w-40 sm:shrink-0">
        <AdminStatusPicker status={share.status} who={share.participant} onSetStatus={(s) => onSetStatus(share.id, s)} />
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

const STATUS_CHIPS: { key: StatusFilter; label: string }[] = [
  { key: "all",       label: "Alles" },
  { key: "pending",   label: "Openstaand" },
  { key: "claimed",   label: "Geclaimd" },
  { key: "confirmed", label: "Bevestigd" },
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
    <AdminPage>
      <AdminPageHeader title="Betalingen" subtitle="Uitgaven en aandelen" />

      {/* Stats: one card, three cells (three full-width cards pushed the list off the screen) */}
      <div className="card-surface grid grid-cols-3 divide-x divide-line">
        <div className="min-w-0 p-2.5 sm:p-4">
          <div className="mb-1.5 flex items-center gap-1.5">
            <AlertCircle size={14} className="hidden shrink-0 sm:block text-warn" />
            <span className="truncate text-xs text-ink-3">Openstaand</span>
          </div>
          <p className="truncate font-display text-[22px] font-extrabold leading-none tabular-nums text-ink sm:text-[26px]">{formatAmount(totals.pending)}</p>
        </div>
        <div className="min-w-0 p-2.5 sm:p-4">
          <div className="mb-1.5 flex items-center gap-1.5">
            <Clock size={14} className="hidden shrink-0 sm:block text-ink-3" />
            <span className="truncate text-xs text-ink-3">Geclaimd</span>
          </div>
          <p className="truncate font-display text-[22px] font-extrabold leading-none tabular-nums text-ink sm:text-[26px]">{formatAmount(totals.claimed)}</p>
        </div>
        <div className="min-w-0 p-2.5 sm:p-4">
          <div className="mb-1.5 flex items-center gap-1.5">
            <CheckCircle2 size={14} className="hidden shrink-0 sm:block text-ok" />
            <span className="truncate text-xs text-ink-3">Bevestigd</span>
          </div>
          <p className="truncate font-display text-[22px] font-extrabold leading-none tabular-nums text-ink sm:text-[26px]">{formatAmount(totals.confirmed)}</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="space-y-3">
        {/* Status chips: four, in one row; on a narrower phone the row scrolls sideways */}
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {STATUS_CHIPS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`chip !px-3 ${statusFilter === key ? "chip-on" : "chip-off"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* One uitgave at a time: a list, not a chip per uitgave */}
        {expenses.length > 0 && (
          <select
            value={expenseFilter ?? ""}
            onChange={(e) => setExpenseFilter(e.target.value || null)}
            aria-label="Filter op uitgave"
            className="input-field w-full sm:max-w-sm"
          >
            <option value="">Alle uitgaven</option>
            {expenses.map((e) => (
              <option key={e.id} value={e.id}>{e.description}</option>
            ))}
          </select>
        )}
      </div>

      {/* Active expense context banner */}
      {selectedExpense && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border-1.5 border-line bg-sunken px-4 py-2.5 text-sm">
          <span className="font-semibold text-ink">{selectedExpense.description}</span>
          <span className="text-ink-3">·</span>
          <span className="text-ink-3">{formatAmount(selectedExpense.amount, selectedExpense.currency)}</span>
          <span className="text-ink-3">·</span>
          <span className="text-ink-3">Betaald door {selectedExpense.paid_by}</span>
          <span className="text-ink-3">·</span>
          <span className="text-ink-3">{formatDateShort(selectedExpense.date)}</span>
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
          <div className="card-surface">
            <EmptyState compact icon={<Euro size={22} />} title="Geen uitgaven gevonden" />
          </div>
        )}

        {!isLoading && expenses.length > 0 && openExpenses.length === 0 && (
          <div className="card-surface">
            <EmptyState compact icon={<CheckCircle2 size={22} />} title="Alles is verrekend" description="De geschiedenis staat hieronder." />
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
              <History size={14} />
              Geschiedenis ({historyExpenses.length})
            </span>
            {historyOpen ? <ChevronUp size={16} className="text-ink-3" /> : <ChevronDown size={16} className="text-ink-3" />}
          </button>

          {historyOpen && (
            <div className="space-y-4">
              {historyGroups.map((group) => (
                <div key={group.label} className="space-y-2">
                  <p className="label-quiet !text-ink-2">{group.label}</p>
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
    </AdminPage>
  );
}
