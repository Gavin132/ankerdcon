import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Euro, Clock, MapPin, Bus } from "lucide-react";
import {
  useAdminMeals,
  useAdminCreateMeal,
  useAdminUpdateMeal,
  useAdminDeleteMeal,
  useAdminRemoveMealParticipant,
  useAdminBulkDeleteMeals,
} from "../../hooks/useAdmin";
import { UserAvatar } from "../../components/common/UserAvatar";
import { AdminDrawer } from "./AdminDrawer";
import { toast } from "../../store/toast.store";
import type { Meal } from "../../types";
import { F, L } from "./styles";
import { AdminPageHeader } from "./components/AdminPageHeader";
import { AdminSearch } from "./components/AdminSearch";
import { AdminTableSkeleton } from "./components/AdminTableSkeleton";
import { AdminPagination } from "./components/AdminPagination";
import { DeleteConfirmActions } from "./components/DeleteConfirmActions";
import { DrawerFooter } from "./components/DrawerFooter";
import { ParticipantList } from "./components/ParticipantList";
import { AdminBulkBar } from "./components/AdminBulkBar";
import { useTableSelection } from "../../hooks/useTableSelection";

const PAGE_SIZE = 15;

const mealSchema = z.object({
  meal_name: z.string().min(1, "Naam is verplicht"),
  time: z.string().min(1, "Tijdstip is verplicht"),
  location: z.string().optional(),
  cost: z.coerce.number().min(0),
  transport_needed: z.boolean().optional(),
});
type MealForm = z.infer<typeof mealSchema>;

// ── Meal drawer ───────────────────────────────────────────────────────────────

function MealDrawer({
  meal,
  onClose,
}: {
  meal: Meal | "new" | null;
  onClose: () => void;
}) {
  const createMutation = useAdminCreateMeal();
  const updateMutation = useAdminUpdateMeal();
  const removeParticipant = useAdminRemoveMealParticipant();
  const isEdit = meal !== null && meal !== "new";
  const open = meal !== null;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MealForm>({
    resolver: zodResolver(mealSchema),
    defaultValues: {
      meal_name: isEdit ? meal.meal_name : "",
      time: isEdit ? meal.time : "",
      location: isEdit ? meal.location : "",
      cost: isEdit ? meal.cost : 0,
      transport_needed: isEdit ? meal.transport_needed : false,
    },
  });

  async function onSubmit(values: MealForm) {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: meal.id, ...values });
        toast("success", "Maaltijd bijgewerkt.");
      } else {
        await createMutation.mutateAsync(values);
        toast("success", `${values.meal_name} aangemaakt.`);
      }
      onClose();
    } catch {
      toast("error", "Kon maaltijd niet opslaan.");
    }
  }

  async function handleRemove(p: string) {
    if (!isEdit) return;
    try {
      await removeParticipant.mutateAsync({ mealId: meal.id, participant: p });
      toast("success", `${p} verwijderd.`);
    } catch {
      toast("error", "Kon deelnemer niet verwijderen.");
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Maaltijd bewerken" : "Nieuwe maaltijd"}
      subtitle={isEdit ? meal.meal_name : "Voeg een food event toe"}
      footer={
        <DrawerFooter
          onCancel={onClose}
          formId="meal-form"
          isPending={isPending}
          isEdit={isEdit}
        />
      }
    >
      <form
        id="meal-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <div>
          <label className={L}>Naam *</label>
          <input
            {...register("meal_name")}
            className={F}
            placeholder="Pizzeria Roma"
          />
          {errors.meal_name && (
            <p className="text-xs text-rose-400 mt-1">
              {errors.meal_name.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={L}>Tijdstip *</label>
            <input {...register("time")} type="time" className={F} />
            {errors.time && (
              <p className="text-xs text-rose-400 mt-1">{errors.time.message}</p>
            )}
          </div>
          <div>
            <label className={L}>Kosten (€)</label>
            <input
              {...register("cost")}
              type="number"
              min={0}
              step={0.01}
              className={F}
              placeholder="12.50"
            />
          </div>
        </div>

        <div>
          <label className={L}>Locatie</label>
          <input
            {...register("location")}
            className={F}
            placeholder="Adres of naam"
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 hover:bg-white/[0.06] transition-colors">
          <input
            type="checkbox"
            {...register("transport_needed")}
            className="cb"
          />
          <span className="text-sm text-slate-300">Transport nodig</span>
        </label>

        {isEdit && (
          <ParticipantList
            participants={meal.participants}
            onRemove={handleRemove}
            isPending={removeParticipant.isPending}
          />
        )}
      </form>
    </AdminDrawer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AdminMealsPage() {
  const { data: meals = [], isLoading } = useAdminMeals();
  const deleteMutation = useAdminDeleteMeal();
  const bulkDeleteMutation = useAdminBulkDeleteMeals();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [drawer, setDrawer] = useState<Meal | "new" | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = meals.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.meal_name.toLowerCase().includes(q) ||
      (m.location ?? "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(0, totalPages - 1));
  const paginated = filtered.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE,
  );

  const { selectedIds, toggleSelect, selectAll, clearSelection, allSelected, indeterminate } =
    useTableSelection(paginated.map((m) => m.id));

  async function handleBulkDelete() {
    const ids = [...selectedIds];
    try {
      await bulkDeleteMutation.mutateAsync(ids);
      toast("success", `${ids.length} maaltijden verwijderd.`);
      clearSelection();
    } catch {
      toast("error", "Kon maaltijden niet verwijderen.");
    }
  }

  function handleSearch(v: string) {
    setSearch(v);
    setPage(0);
  }

  async function handleDelete(mealId: string, name: string) {
    try {
      await deleteMutation.mutateAsync(mealId);
      toast("success", `${name} verwijderd.`);
      setConfirmDeleteId(null);
    } catch {
      toast("error", "Kon maaltijd niet verwijderen.");
    }
  }

  return (
    <div className="p-5 lg:p-8 max-w-6xl mx-auto space-y-5">
      <AdminPageHeader
        title="Maaltijden"
        subtitle={`${meals.length} food events`}
        action={
          <button
            onClick={() => setDrawer("new")}
            className="flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition-colors shadow-sm"
          >
            <Plus size={16} />
            Nieuwe maaltijd
          </button>
        }
      />

      <AdminSearch
        value={search}
        onChange={handleSearch}
        placeholder="Zoek op naam of locatie..."
      />

      <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.06] bg-white dark:bg-slate-800/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06] bg-slate-50/80 dark:bg-slate-900/40">
                <th className="w-10 pl-4 pr-2 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = indeterminate; }}
                    onChange={selectAll}
                    className="cb"
                  />
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Maaltijd
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Tijd
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Kosten
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Deelnemers
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Acties
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {isLoading ? (
                <AdminTableSkeleton cols={6} rows={3} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-sm text-slate-400"
                  >
                    Geen maaltijden gevonden.
                  </td>
                </tr>
              ) : (
                paginated.map((meal) => (
                  <tr
                    key={meal.id}
                    className={`transition-colors ${selectedIds.has(meal.id) ? "bg-sky-500/[0.06] hover:bg-sky-500/[0.08]" : "hover:bg-slate-50 dark:hover:bg-white/[0.03]"}`}
                  >
                    <td
                      className="w-10 pl-4 pr-2 py-3.5"
                      onClick={(e) => { e.stopPropagation(); toggleSelect(meal.id); }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(meal.id)}
                        onChange={() => toggleSelect(meal.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="cb"
                      />
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {meal.meal_name}
                      </p>
                      {meal.location && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin size={10} className="text-slate-400" />
                          <span className="text-xs text-slate-400">
                            {meal.location}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-slate-400" />
                        <span className="text-sm font-mono text-slate-700 dark:text-slate-300">
                          {meal.time}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <Euro size={12} className="text-slate-400" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {meal.cost.toFixed(2)}
                        </span>
                      </div>
                      {meal.transport_needed && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Bus size={10} className="text-amber-500" />
                          <span className="text-[10px] text-amber-600 dark:text-amber-400">
                            Transport
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex -space-x-1.5">
                        {meal.participants.length === 0 ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          <>
                            {meal.participants.slice(0, 4).map((p) => (
                              <UserAvatar
                                key={p}
                                name={p}
                                className="h-6 w-6 text-[8px] ring-2 ring-slate-800"
                              />
                            ))}
                            {meal.participants.length > 4 && (
                              <span className="flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-slate-800 bg-slate-700 text-[9px] font-bold text-slate-300">
                                +{meal.participants.length - 4}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <DeleteConfirmActions
                        id={meal.id}
                        confirmId={confirmDeleteId}
                        isPending={deleteMutation.isPending}
                        onEdit={() => setDrawer(meal)}
                        onRequestDelete={() => setConfirmDeleteId(meal.id)}
                        onConfirmDelete={() =>
                          handleDelete(meal.id, meal.meal_name)
                        }
                        onCancelDelete={() => setConfirmDeleteId(null)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination
          page={currentPage}
          totalPages={totalPages}
          total={filtered.length}
          pageSize={PAGE_SIZE}
          onPage={setPage}
        />
      </div>

      <MealDrawer
        key={
          typeof drawer === "object" && drawer !== null
            ? drawer.id
            : (drawer ?? "none")
        }
        meal={drawer}
        onClose={() => setDrawer(null)}
      />

      <AdminBulkBar
        count={selectedIds.size}
        isPending={bulkDeleteMutation.isPending}
        onDelete={handleBulkDelete}
        onClear={clearSelection}
      />
    </div>
  );
}
