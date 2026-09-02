import { useState } from "react";
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

  const [form, setForm] = useState<FormState>(
    isEdit
      ? { title: entry.title, released_at: entry.released_at, itemsText: entry.items.join("\n") }
      : toEmpty(),
  );

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

  return (
    <AdminDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Item bewerken" : "Nieuw wijzigingslog-item"}
      subtitle="Zichtbaar voor alle gebruikers via 'Wat is nieuw'"
      footer={
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={!isValid || isSaving}
            className="flex-1 rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? "Opslaan..." : isEdit ? "Bijwerken" : "Plaatsen"}
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/[0.05] transition-colors"
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
          <p className="mt-1.5 text-[11px] text-slate-500">Eén punt per regel.</p>
        </div>
      </div>
    </AdminDrawer>
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
    <div className="p-5 lg:p-8 max-w-6xl mx-auto space-y-5">
      <AdminPageHeader
        title="Wijzigingslog"
        subtitle={`${entries.length} item${entries.length !== 1 ? "s" : ""}`}
        action={
          <button
            onClick={() => setDrawer("new")}
            className="flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition-colors shadow-sm"
          >
            <Plus size={16} />
            Nieuw item
          </button>
        }
      />

      <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.06] bg-white dark:bg-slate-800/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06] bg-slate-50/80 dark:bg-slate-900/40">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Datum
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Titel
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Punten
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Acties
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {isLoading ? (
                <AdminTableSkeleton cols={4} />
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Sparkles size={28} className="opacity-30" />
                      <p className="text-sm">Nog geen wijzigingslog-items.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-slate-500 dark:text-slate-400">{entry.released_at}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white max-w-md truncate">
                        {entry.title}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-slate-500 dark:text-slate-400">{entry.items.length}</p>
                    </td>
                    <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
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
