import { useState, useRef } from "react";
import { Plus, Sparkles } from "lucide-react";
import {
  useAdminChangelog,
  useCreateChangelogEntry,
  useUpdateChangelogEntry,
  useDeleteChangelogEntry,
} from "../../hooks/useChangelog";
import { AdminDrawer } from "./AdminDrawer";
import { toDateKey } from "../../utils/date";
import { getNow } from "../../store/time.store";
import { formatDate } from "../../utils/format";
import { AdminPage } from "./components/AdminPage";
import { AdminPageHeader } from "./components/AdminPageHeader";
import { AdminTableSkeleton } from "./components/AdminTableSkeleton";
import { DrawerFooter } from "./components/DrawerFooter";
import { DeleteConfirmActions } from "./components/DeleteConfirmActions";
import { DiscardChangesConfirm } from "./components/DiscardChangesConfirm";
import { useConfirmDiscard } from "../../hooks/useConfirmDiscard";
import { F, L, TH, TD, TR } from "./styles";
import { toast } from "../../store/toast.store";
import type { ChangelogEntry } from "../../types";
import { EmptyState } from "../../components/common/EmptyState";

function todayIso(): string {
  return toDateKey(getNow());
}

// ── Drawer (create / edit) ──────────────────────────────────────────────────────

interface FormState {
  title: string;
  released_at: string;
  itemsText: string;
}

function toEmpty(): FormState {
  return { title: "", released_at: todayIso(), itemsText: "" };
}

function ChangelogDrawer({
  entry,
  onClose,
}: {
  entry: ChangelogEntry | "new" | null;
  onClose: () => void;
}) {
  const isEdit = entry !== null && entry !== "new";
  const open = entry !== null;

  const createEntry = useCreateChangelogEntry();
  const updateEntry = useUpdateChangelogEntry();

  const initialForm = useRef<FormState>(
    isEdit
      ? { title: entry.title, released_at: entry.released_at, itemsText: entry.items.join("\n") }
      : toEmpty(),
  );
  const [form, setForm] = useState<FormState>(initialForm.current);

  const items = form.itemsText.split("\n").map((s) => s.trim()).filter(Boolean);
  const isValid = !!form.title.trim() && items.length > 0;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    try {
      if (isEdit) {
        await updateEntry.mutateAsync({ id: entry.id, title: form.title, released_at: form.released_at, items });
        toast("success", "Item bijgewerkt.");
      } else {
        await createEntry.mutateAsync({ title: form.title, released_at: form.released_at, items });
        toast("success", "Item geplaatst.");
      }
      onClose();
    } catch {
      toast("error", "Kon het item niet opslaan. Probeer het opnieuw.");
    }
  }

  const isSaving = createEntry.isPending || updateEntry.isPending;
  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm.current);
  const { requestClose, confirming, confirmDiscard, cancelDiscard } = useConfirmDiscard(isDirty, onClose);

  return (
    <>
    <AdminDrawer
      open={open}
      onClose={requestClose}
      title={isEdit ? "Item bewerken" : "Nieuw item"}
      subtitle='Te zien onder "Wat is nieuw"'
      footer={
        <DrawerFooter
          onCancel={requestClose}
          formId="changelog-form"
          isPending={isSaving}
          isEdit={isEdit}
          submitLabel={isEdit ? undefined : "Plaatsen"}
          disabled={!isValid}
        />
      }
    >
      <form id="changelog-form" onSubmit={handleSave} className="space-y-4">
        <div>
          <label className={L}>Titel *</label>
          <input
            className={F}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Bijvoorbeeld: snellere ritten en meer controle voor admins"
          />
        </div>
        <div>
          <label className={L}>Datum</label>
          <input
            type="date"
            className={F}
            value={form.released_at}
            onChange={(e) => setForm((f) => ({ ...f, released_at: e.target.value }))}
          />
        </div>
        <div>
          <label className={L}>Wat is er veranderd? *</label>
          <textarea
            className={F}
            rows={6}
            value={form.itemsText}
            onChange={(e) => setForm((f) => ({ ...f, itemsText: e.target.value }))}
            placeholder={"Eén punt per regel, bijvoorbeeld:\nSnel een rit aanbieden vanaf het hoofdscherm\nStandaard aantal plekken staat nu op 5"}
          />
          <p className="mt-1.5 text-xs text-ink-3">Eén punt per regel.</p>
        </div>
      </form>
    </AdminDrawer>
    <DiscardChangesConfirm open={confirming} onCancel={cancelDiscard} onConfirm={confirmDiscard} />
    </>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function AdminChangelogPage() {
  const { data: entries = [], isLoading } = useAdminChangelog();
  const deleteEntry = useDeleteChangelogEntry();

  const [drawer, setDrawer] = useState<ChangelogEntry | "new" | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    try {
      await deleteEntry.mutateAsync(id);
      toast("success", "Item verwijderd.");
      setConfirmDeleteId(null);
    } catch {
      toast("error", "Kon het item niet verwijderen. Probeer het opnieuw.");
    }
  }

  return (
    <AdminPage>
      <AdminPageHeader
        title="Wijzigingslog"
        subtitle={`${entries.length} ${entries.length === 1 ? "item" : "items"}`}
        action={
          <button
            onClick={() => setDrawer("new")}
            className="btn-primary gap-2 px-4"
          >
            <Plus size={16} />
            Nieuw item
          </button>
        }
      />

      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="stack-table w-full">
            <thead>
              <tr>
                <th className={`${TH} hidden sm:table-cell`}>Datum</th>
                <th className={TH}>Titel</th>
                <th className={`${TH} hidden sm:table-cell`}>Punten</th>
                <th className={`${TH} text-right`}>Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading ? (
                <AdminTableSkeleton cols={4} />
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <EmptyState compact icon={<Sparkles size={22} />} title="Nog geen items in de wijzigingslog" />
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className={TR}>
                    <td className={`hidden sm:table-cell ${TD}`}>
                      <p className="whitespace-nowrap font-mono text-[12.5px] text-ink-2">{formatDate(entry.released_at)}</p>
                    </td>
                    <td className={`cell-main ${TD}`}>
                      <p className="max-w-md truncate text-sm font-semibold text-ink">{entry.title}</p>
                      {/* On a phone the date and the number of points sit under the title; the columns are hidden. */}
                      <p className="mt-0.5 text-xs text-ink-3 sm:hidden">
                        {formatDate(entry.released_at)} · {entry.items.length} {entry.items.length === 1 ? "punt" : "punten"}
                      </p>
                    </td>
                    <td className={`hidden sm:table-cell ${TD}`}>
                      <p className="text-sm text-ink-3">{entry.items.length}</p>
                    </td>
                    <td className={`cell-actions ${TD}`}>
                      <DeleteConfirmActions
                        id={entry.id}
                        confirmId={confirmDeleteId}
                        isPending={deleteEntry.isPending}
                        onEdit={() => setDrawer(entry)}
                        onRequestDelete={() => setConfirmDeleteId(entry.id)}
                        onConfirmDelete={() => handleDelete(entry.id)}
                        onCancelDelete={() => setConfirmDeleteId(null)}
                        editLabel={`${entry.title} bewerken`}
                        deleteLabel={`${entry.title} verwijderen`}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ChangelogDrawer
        key={typeof drawer === "object" && drawer !== null ? drawer.id : (drawer ?? "none")}
        entry={drawer}
        onClose={() => setDrawer(null)}
      />
    </AdminPage>
  );
}
