import { useState, useRef } from "react";
import { Plus, Sparkles } from "lucide-react";
import {
  useAdminChangelog,
  useCreateChangelogEntry,
  useUpdateChangelogEntry,
  useDeleteChangelogEntry,
} from "../../hooks/useChangelog";
import { AdminDrawer } from "./AdminDrawer";
import { AdminPageHeader } from "./components/AdminPageHeader";
import { AdminTableSkeleton } from "./components/AdminTableSkeleton";
import { DeleteConfirmActions } from "./components/DeleteConfirmActions";
import { DiscardChangesConfirm } from "./components/DiscardChangesConfirm";
import { useConfirmDiscard } from "../../hooks/useConfirmDiscard";
import { F, L, SECTION, SECTION_TITLE } from "./styles";
import { toast } from "../../store/toast.store";
import type { ChangelogEntry } from "../../types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
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

  async function handleSave() {
    if (!isValid) return;
    try {
      if (isEdit) {
        await updateEntry.mutateAsync({ id: entry.id, title: form.title, released_at: form.released_at, items });
        toast("success", "Wijzigingslog-item bijgewerkt.");
      } else {
        await createEntry.mutateAsync({ title: form.title, released_at: form.released_at, items });
        toast("success", "Wijzigingslog-item geplaatst.");
      }
      onClose();
    } catch {
      toast("error", "Kon niet opslaan.");
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
      title={isEdit ? "Item bewerken" : "Nieuw wijzigingslog-item"}
      subtitle="Zichtbaar voor alle gebruikers via 'Wat is nieuw'"
      footer={
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={!isValid || isSaving}
            className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Opslaan..." : isEdit ? "Bijwerken" : "Plaatsen"}
          </button>
          <button
            onClick={requestClose}
            className="rounded-xl border-1.5 border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink-3"
          >
            Annuleren
          </button>
        </div>
      }
    >
      <div className={SECTION}>
        <p className={SECTION_TITLE}>Update</p>
        <div>
          <label className={L}>Titel *</label>
          <input
            className={F}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="bijv. Snellere ritten & meer admin-controle"
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
            placeholder={"Eén punt per regel, bijv.:\nSnel een rit aanbieden vanaf het hoofdscherm\nStandaard aantal plekken staat nu op 5"}
          />
          <p className="mt-1.5 text-[11px] text-ink-3">Eén punt per regel.</p>
        </div>
      </div>
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
      toast("error", "Kon item niet verwijderen.");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <AdminPageHeader
        title="Wijzigingslog"
        subtitle={`${entries.length} item${entries.length !== 1 ? "s" : ""}`}
        action={
          <button
            onClick={() => setDrawer("new")}
            className="btn-primary gap-2 px-4 py-2.5 text-sm"
          >
            <Plus size={16} />
            Nieuw item
          </button>
        }
      />

      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-1.5 border-line">
                <th className="px-2.5 sm:px-5 py-2.5 sm:py-3 text-left whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[0.09em] text-ink-3">
                  Datum
                </th>
                <th className="px-2.5 sm:px-5 py-2.5 sm:py-3 text-left whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[0.09em] text-ink-3">
                  Titel
                </th>
                <th className="hidden sm:table-cell px-5 py-3 text-left whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[0.09em] text-ink-3">
                  Punten
                </th>
                <th className="px-2 sm:px-5 py-2.5 sm:py-3 text-right whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[0.09em] text-ink-3">
                  Acties
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading ? (
                <AdminTableSkeleton cols={4} />
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-ink-3">
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-sunken text-ink-3"><Sparkles size={22} /></span>
                      <p className="text-sm">Nog geen wijzigingslog-items.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-sunken transition-colors">
                    <td className="px-2.5 sm:px-5 py-2.5 sm:py-3.5">
                      <p className="whitespace-nowrap font-mono text-[12.5px] text-ink-2">{entry.released_at}</p>
                    </td>
                    <td className="px-2.5 sm:px-5 py-2.5 sm:py-3.5">
                      <p className="text-sm font-semibold text-ink max-w-[160px] sm:max-w-md truncate">
                        {entry.title}
                      </p>
                    </td>
                    <td className="hidden sm:table-cell px-5 py-3.5">
                      <p className="text-sm text-ink-3">{entry.items.length}</p>
                    </td>
                    <td className="px-2 sm:px-5 py-2.5 sm:py-3.5" onClick={(e) => e.stopPropagation()}>
                      <DeleteConfirmActions
                        id={entry.id}
                        confirmId={confirmDeleteId}
                        isPending={deleteEntry.isPending}
                        onEdit={() => setDrawer(entry)}
                        onRequestDelete={() => setConfirmDeleteId(entry.id)}
                        onConfirmDelete={() => handleDelete(entry.id)}
                        onCancelDelete={() => setConfirmDeleteId(null)}
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
    </div>
  );
}
