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
import { F, TH, TD, TR, TR_SELECTED } from "./styles";
import { AdminPage } from "./components/AdminPage";
import { AdminPageHeader } from "./components/AdminPageHeader";
import { AdminTableSkeleton } from "./components/AdminTableSkeleton";
import { AdminPagination } from "./components/AdminPagination";
import { DeleteConfirmActions } from "./components/DeleteConfirmActions";
import { AdminBulkBar } from "./components/AdminBulkBar";
import { RowCheckbox } from "./components/RowCheckbox";
import { useTableSelection } from "../../hooks/useTableSelection";
import { EmptyState } from "../../components/common/EmptyState";

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
      toast("error", "Kon de groepen niet verwijderen. Probeer het opnieuw.");
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
      toast("error", "Kon de groep niet aanmaken. Probeer het opnieuw.");
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
      toast("error", "Kon de groep niet bijwerken. Probeer het opnieuw.");
    }
  }

  async function handleDelete(id: string, name: string) {
    try {
      await deleteMutation.mutateAsync(id);
      setConfirmDeleteId(null);
      toast("success", `Groep "${name}" verwijderd.`);
    } catch {
      toast("error", "Kon de groep niet verwijderen. Probeer het opnieuw.");
    }
  }

  return (
    <AdminPage>
      <AdminPageHeader
        title="Evenementgroepen"
        subtitle={`${groups.length} ${groups.length === 1 ? "groep" : "groepen"}`}
      />

      {/* Create form */}
      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className={`${F} flex-1`}
          aria-label="Naam van de nieuwe groep"
          placeholder="Naam van de nieuwe groep"
        />
        <button
          type="submit"
          disabled={!newName.trim() || createMutation.isPending}
          className="btn-primary min-h-[44px] gap-2 px-4 py-2.5 text-sm"
        >
          <Plus size={16} />
          Aanmaken
        </button>
      </form>

      {/* Groups table */}
      <AdminBulkBar
        itemsLabel="groepen"
        count={selectedIds.size}
        isPending={bulkDeleteMutation.isPending}
        onDelete={handleBulkDelete}
        onClear={clearSelection}
      />

      <div className="card-surface overflow-hidden">
        <table className="stack-table w-full">
          <thead>
            <tr>
              <th className={`${TH} w-10 !pr-2`}>
                <RowCheckbox checked={allSelected} indeterminate={indeterminate} onChange={selectAll} label="Alles selecteren" />
              </th>
              <th className={TH}>Groepsnaam</th>
              <th className={`${TH} text-right`}>Acties</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading ? (
              <AdminTableSkeleton cols={3} />
            ) : groups.length === 0 ? (
              <tr>
                <td colSpan={3}>
                  <EmptyState compact icon={<Layers size={22} />} title="Nog geen groepen aangemaakt" />
                </td>
              </tr>
            ) : (
              paginated.map((group) => (
                <tr key={group.id} className={selectedIds.has(group.id) ? TR_SELECTED : TR}>
                  <td className={`${TD} w-10 !pr-2`} onClick={(e) => { e.stopPropagation(); toggleSelect(group.id); }}>
                    <RowCheckbox checked={selectedIds.has(group.id)} onChange={() => toggleSelect(group.id)} label={`Selecteer ${group.name}`} />
                  </td>
                  <td className={`cell-main ${TD}`}>
                    {editingId === group.id ? (
                      <input
                        autoFocus
                        aria-label="Naam van de groep"
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
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
                          <Layers size={14} />
                        </div>
                        <span className="text-sm font-semibold text-ink truncate">
                          {group.name}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className={`cell-actions ${TD}`}>
                    {editingId === group.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => saveEdit(group.id)}
                          disabled={updateMutation.isPending}
                          className="icon-btn"
                          title="Opslaan"
                          aria-label="Opslaan"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="icon-btn"
                          title="Annuleren"
                          aria-label="Annuleren"
                        >
                          <X size={16} />
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
                        editLabel={`${group.name} hernoemen`}
                        deleteLabel={`${group.name} verwijderen`}
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
    </AdminPage>
  );
}
