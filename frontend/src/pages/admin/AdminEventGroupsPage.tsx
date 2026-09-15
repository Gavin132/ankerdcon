import { useState } from "react";
import { Plus, Layers, Check, X } from "lucide-react";
import {
  useAdminEventGroups,
  useAdminCreateEventGroup,
  useAdminUpdateEventGroup,
  useAdminDeleteEventGroup,
  useAdminBulkDeleteEventGroups,
} from "../../hooks/useAdmin";
import { toast } from "../../store/toast.store";
import { F } from "./styles";
import { AdminPageHeader } from "./components/AdminPageHeader";
import { AdminTableSkeleton } from "./components/AdminTableSkeleton";
import { AdminPagination } from "./components/AdminPagination";
import { DeleteConfirmActions } from "./components/DeleteConfirmActions";
import { AdminBulkBar } from "./components/AdminBulkBar";
import { useTableSelection } from "../../hooks/useTableSelection";

const PAGE_SIZE = 15;

export function AdminEventGroupsPage() {
  const { data: groups = [], isLoading } = useAdminEventGroups();
  const createMutation = useAdminCreateEventGroup();
  const updateMutation = useAdminUpdateEventGroup();
  const deleteMutation = useAdminDeleteEventGroup();
  const bulkDeleteMutation = useAdminBulkDeleteEventGroups();

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(groups.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(0, totalPages - 1));
  const paginated = groups.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const { selectedIds, toggleSelect, selectAll, clearSelection, allSelected, indeterminate } =
    useTableSelection(paginated.map((g) => g.id));

  async function handleBulkDelete() {
    const ids = [...selectedIds];
    try {
      await bulkDeleteMutation.mutateAsync(ids);
      toast("success", `${ids.length} groepen verwijderd.`);
      clearSelection();
    } catch {
      toast("error", "Kon groepen niet verwijderen.");
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    try {
      await createMutation.mutateAsync(name);
      setNewName("");
      toast("success", `Groep "${name}" aangemaakt.`);
    } catch {
      toast("error", "Kon groep niet aanmaken.");
    }
  }

  function startEdit(id: string, name: string) {
    setEditingId(id);
    setEditingName(name);
  }

  async function saveEdit(id: string) {
    const name = editingName.trim();
    if (!name) return;
    try {
      await updateMutation.mutateAsync({ id, name });
      setEditingId(null);
      toast("success", "Groep bijgewerkt.");
    } catch {
      toast("error", "Kon groep niet bijwerken.");
    }
  }

  async function handleDelete(id: string, name: string) {
    try {
      await deleteMutation.mutateAsync(id);
      setConfirmDeleteId(null);
      toast("success", `Groep "${name}" verwijderd.`);
    } catch {
      toast("error", "Kon groep niet verwijderen.");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <AdminPageHeader
        title="Evenementgroepen"
        subtitle={`${groups.length} groepen`}
      />

      {/* Create form */}
      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className={`${F} flex-1`}
          placeholder="Nieuwe groepsnaam, bijv. Comic Con…"
        />
        <button
          type="submit"
          disabled={!newName.trim() || createMutation.isPending}
          className="btn-primary gap-2 px-4 py-2.5 text-sm disabled:opacity-50"
        >
          <Plus size={15} />
          Aanmaken
        </button>
      </form>

      {/* Groups table */}
      <div className="card-surface overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b-1.5 border-line">
              <th className="w-8 sm:w-10 pl-2.5 sm:pl-4 pr-1.5 sm:pr-2 py-2.5 sm:py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = indeterminate; }}
                  onChange={selectAll}
                  className="cb"
                />
              </th>
              <th className="px-2.5 sm:px-5 py-2.5 sm:py-3 text-left whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[0.09em] text-ink-3">
                Groepsnaam
              </th>
              <th className="px-2 sm:px-5 py-2.5 sm:py-3 text-right whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[0.09em] text-ink-3">
                Acties
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading ? (
              <AdminTableSkeleton cols={3} />
            ) : groups.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-5 py-10 text-center text-sm text-ink-3">
                  Nog geen groepen aangemaakt.
                </td>
              </tr>
            ) : (
              paginated.map((group) => (
                <tr
                  key={group.id}
                  className={`transition-colors ${selectedIds.has(group.id) ? "bg-brand-soft/50 hover:bg-brand-soft/70" : "hover:bg-sunken"}`}
                >
                  <td
                    className="w-8 sm:w-10 pl-2.5 sm:pl-4 pr-1.5 sm:pr-2 py-2.5 sm:py-3.5"
                    onClick={(e) => { e.stopPropagation(); toggleSelect(group.id); }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(group.id)}
                      onChange={() => toggleSelect(group.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="cb"
                    />
                  </td>
                  <td className="px-2.5 sm:px-5 py-2.5 sm:py-3.5">
                    {editingId === group.id ? (
                      <input
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(group.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className={`${F} max-w-xs`}
                      />
                    ) : (
                      <div className="flex items-center gap-2 sm:gap-2.5">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink sm:h-7 sm:w-7">
                          <Layers size={13} />
                        </div>
                        <span className="text-sm font-semibold text-ink truncate">
                          {group.name}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-2 sm:px-5 py-2.5 sm:py-3.5">
                    {editingId === group.id ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => saveEdit(group.id)}
                          disabled={updateMutation.isPending}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink text-paper transition-colors disabled:opacity-50 dark:bg-brand dark:text-brand-on"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-3 hover:bg-sunken hover:text-ink transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <DeleteConfirmActions
                        id={group.id}
                        confirmId={confirmDeleteId}
                        isPending={deleteMutation.isPending}
                        onEdit={() => startEdit(group.id, group.name)}
                        onRequestDelete={() => setConfirmDeleteId(group.id)}
                        onConfirmDelete={() => handleDelete(group.id, group.name)}
                        onCancelDelete={() => setConfirmDeleteId(null)}
                      />
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <AdminPagination
          page={currentPage}
          totalPages={totalPages}
          total={groups.length}
          pageSize={PAGE_SIZE}
          onPage={setPage}
        />
      </div>

      <AdminBulkBar
        count={selectedIds.size}
        isPending={bulkDeleteMutation.isPending}
        onDelete={handleBulkDelete}
        onClear={clearSelection}
      />
    </div>
  );
}
