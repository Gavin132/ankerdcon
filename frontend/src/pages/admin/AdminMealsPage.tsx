import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Clock, Bus, MapPin, UtensilsCrossed } from "lucide-react";
import { LocationSearchInput } from "../../components/common/LocationSearchInput";
import { formatAmount, formatDateTime } from "../../utils/format";
import {
  useAdminMeals,
  useAdminCreateMeal,
  useAdminUpdateMeal,
  useAdminDeleteMeal,
  useAdminRemoveMealParticipant,
  useAdminBulkDeleteMeals,
} from "../../hooks/useAdmin";
import { useCalendar } from "../../hooks/useCalendar";
import { useMealCategories } from "../../hooks/useMeals";
import { AvatarStack } from "../../components/common/AvatarStack";
import { AdminDrawer } from "./AdminDrawer";
import { toast } from "../../store/toast.store";
import type { Meal } from "../../types";
import { F, L, SECTION, SECTION_TITLE, TH, TD, TR, TR_SELECTED } from "./styles";
import { AdminPage } from "./components/AdminPage";
import { ToggleRow } from "../../components/common/ToggleRow";
import { AdminPageHeader } from "./components/AdminPageHeader";
import { AdminSearch } from "./components/AdminSearch";
import { AdminTableSkeleton } from "./components/AdminTableSkeleton";
import { AdminPagination } from "./components/AdminPagination";
import { DeleteConfirmActions } from "./components/DeleteConfirmActions";
import { DrawerFooter } from "./components/DrawerFooter";
import { DiscardChangesConfirm } from "./components/DiscardChangesConfirm";
import { ParticipantList } from "./components/ParticipantList";
import { AdminBulkBar } from "./components/AdminBulkBar";
import { RowCheckbox } from "./components/RowCheckbox";
import { useTableSelection } from "../../hooks/useTableSelection";
import { useConfirmDiscard } from "../../hooks/useConfirmDiscard";
import { EmptyState } from "../../components/common/EmptyState";

const PAGE_SIZE = 15;

const optStr = (v: unknown) => (v == null ? "" : v);

const mealSchema = z.object({
  meal_name: z.string().min(1, "Naam is verplicht"),
  time: z.string().min(1, "Tijdstip is verplicht"),
  location: z.string().optional(),
  maps_url: z.preprocess(optStr, z.string()).optional(),
  cost: z.coerce.number().min(0),
  transport_needed: z.boolean().optional(),
  linked_event_id: z.preprocess(optStr, z.string()).optional(),
  category_id: z.preprocess(optStr, z.string()).optional(),
  website: z.preprocess(optStr, z.string()).optional(),
  menu_url: z.preprocess(optStr, z.string()).optional(),
  description: z.preprocess(optStr, z.string()).optional(),
  dietary_options: z.preprocess(optStr, z.string()).optional(),
  parking_info: z.preprocess(optStr, z.string()).optional(),
  extra_notes: z.preprocess(optStr, z.string()).optional(),
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
  const { data: allEvents = [] } = useCalendar();
  const { data: categories = [] } = useMealCategories();
  const isEdit = meal !== null && meal !== "new";
  const open = meal !== null;

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<MealForm>({
    resolver: zodResolver(mealSchema),
    defaultValues: {
      meal_name: isEdit ? meal.meal_name : "",
      time: isEdit ? meal.time : "",
      location: isEdit ? meal.location : "",
      maps_url: isEdit ? (meal.maps_url ?? "") : "",
      cost: isEdit ? meal.cost : 0,
      transport_needed: isEdit ? meal.transport_needed : false,
      linked_event_id: isEdit ? (meal.linked_event_id ?? "") : "",
      category_id: isEdit ? (meal.category_id ?? "") : "",
      website: isEdit ? (meal.website ?? "") : "",
      menu_url: isEdit ? (meal.menu_url ?? "") : "",
      description: isEdit ? (meal.description ?? "") : "",
      dietary_options: isEdit ? (meal.dietary_options ?? "") : "",
      parking_info: isEdit ? (meal.parking_info ?? "") : "",
      extra_notes: isEdit ? (meal.extra_notes ?? "") : "",
    },
  });

  const transportNeeded = watch("transport_needed");

  async function onSubmit(values: MealForm) {
    const payload = {
      ...values,
      linked_event_id: values.linked_event_id || null,
      category_id: values.category_id || undefined,
      maps_url: values.maps_url || null,
      website: values.website || null,
      menu_url: values.menu_url || null,
      description: values.description || null,
      dietary_options: values.dietary_options || null,
      parking_info: values.parking_info || null,
      extra_notes: values.extra_notes || null,
    };
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: meal.id, ...payload });
        toast("success", "Activiteit bijgewerkt.");
      } else {
        await createMutation.mutateAsync(payload);
        toast("success", `${values.meal_name} aangemaakt.`);
      }
      onClose();
    } catch {
      toast("error", "Kon activiteit niet opslaan.");
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
  const { requestClose, confirming, confirmDiscard, cancelDiscard } = useConfirmDiscard(isDirty, onClose);

  return (
    <>
    <AdminDrawer
      open={open}
      onClose={requestClose}
      title={isEdit ? "Activiteit bewerken" : "Nieuwe activiteit"}
      subtitle={isEdit ? meal.meal_name : "Voeg een activiteit toe"}
      footer={
        <DrawerFooter
          onCancel={requestClose}
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
            <p className="field-error">
              {errors.meal_name.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={L}>Datum & tijd *</label>
            <input {...register("time")} type="datetime-local" className={F} />
            {errors.time && (
              <p className="field-error">
                {errors.time.message}
              </p>
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
          <Controller
            name="location"
            control={control}
            render={({ field }) => (
              <LocationSearchInput
                value={field.value ?? ""}
                onChange={field.onChange}
                inputClassName={F}
              />
            )}
          />
          <p className="mt-1.5 text-xs text-ink-3">
            Zoek een naam of adres en kies een resultaat om de locatie te bevestigen op de kaart.
          </p>
        </div>

        <div>
          <label className={L}>Google Maps-link</label>
          <input
            {...register("maps_url")}
            className={F}
            placeholder="https://maps.app.goo.gl/…"
          />
          <p className="mt-1.5 text-xs text-ink-3">
            Opent direct de juiste plek vanaf de crewkaart. Zonder locatie hierboven krijgt deze activiteit geen pin.
          </p>
        </div>

        <ToggleRow
          icon={<Bus size={16} />}
          label="Vervoer nodig"
          checked={!!transportNeeded}
          onChange={() => setValue("transport_needed", !transportNeeded, { shouldDirty: true })}
        />

        {/* ── Extended info ─────────────────────────────────────────── */}
        <div className={SECTION}>
          <p className={SECTION_TITLE}>Koppeling & details</p>

          {categories.length > 0 && (
            <div>
              <label className={L}>Categorie</label>
              <select {...register("category_id")} className={F}>
                {!isEdit && <option value="">— Standaard (bovenste) —</option>}
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className={L}>Koppel aan evenement</label>
            <select
              {...register("linked_event_id")}
              className={F}
            >
              <option value="">— Geen evenement —</option>
              {allEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.event_name} ({ev.date})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={L}>Website restaurant</label>
            <input
              {...register("website")}
              className={F}
              placeholder="https://restauranturl.nl"
            />
          </div>

          <div>
            <label className={L}>Link naar menu</label>
            <input
              {...register("menu_url")}
              className={F}
              placeholder="https://restauranturl.nl/menu"
            />
          </div>

          <div>
            <label className={L}>Beschrijving / sfeer</label>
            <textarea
              {...register("description")}
              rows={3}
              className={`${F} resize-none`}
              placeholder="Extra context over het restaurant, sfeer, dresscode…"
            />
          </div>
        </div>

        <div className={SECTION}>
          <p className={SECTION_TITLE}>Praktisch</p>

          <div>
            <label className={L}>Dieetopties</label>
            <textarea
              {...register("dietary_options")}
              rows={2}
              className={`${F} resize-none`}
              placeholder="Vegetarisch, vegan, glutenvrij beschikbaar…"
            />
          </div>

          <div>
            <label className={L}>Parkeerinfo</label>
            <textarea
              {...register("parking_info")}
              rows={2}
              className={`${F} resize-none`}
              placeholder="Parkeergarage op 200m, gratis na 18:00…"
            />
          </div>

          <div>
            <label className={L}>Extra notities</label>
            <textarea
              {...register("extra_notes")}
              rows={2}
              className={`${F} resize-none`}
              placeholder="Reservering vereist, ID meenemen…"
            />
          </div>
        </div>

        {isEdit && (
          <ParticipantList
            participants={meal.participants}
            onRemove={handleRemove}
            isPending={removeParticipant.isPending}
          />
        )}
      </form>
    </AdminDrawer>
    <DiscardChangesConfirm open={confirming} onCancel={cancelDiscard} onConfirm={confirmDiscard} />
    </>
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

  const {
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    allSelected,
    indeterminate,
  } = useTableSelection(paginated.map((m) => m.id));

  async function handleBulkDelete() {
    const ids = [...selectedIds];
    try {
      await bulkDeleteMutation.mutateAsync(ids);
      toast("success", `${ids.length} activiteiten verwijderd.`);
      clearSelection();
    } catch {
      toast("error", "Kon de activiteiten niet verwijderen. Probeer het opnieuw.");
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
      toast("error", "Kon de activiteit niet verwijderen. Probeer het opnieuw.");
    }
  }

  return (
    <AdminPage>
      <AdminPageHeader
        title="Activiteiten"
        subtitle={`${meals.length} ${meals.length === 1 ? "activiteit" : "activiteiten"}`}
        action={
          <button
            onClick={() => setDrawer("new")}
            className="btn-primary gap-2 px-4"
          >
            <Plus size={16} />
            Nieuwe activiteit
          </button>
        }
      />

      <AdminSearch
        value={search}
        onChange={handleSearch}
        placeholder="Zoek op naam of locatie…"
      />

      <AdminBulkBar
        itemsLabel="activiteiten"
        count={selectedIds.size}
        isPending={bulkDeleteMutation.isPending}
        onDelete={handleBulkDelete}
        onClear={clearSelection}
      />

      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="stack-table w-full">
            <thead>
              <tr>
                <th className={`${TH} w-10 !pr-2`}>
                  <RowCheckbox checked={allSelected} indeterminate={indeterminate} onChange={selectAll} label="Alles selecteren" />
                </th>
                <th className={TH}>Activiteit</th>
                <th className={`${TH} hidden sm:table-cell`}>Tijd</th>
                <th className={`${TH} hidden sm:table-cell`}>Kosten</th>
                <th className={`${TH} hidden sm:table-cell`}>Deelnemers</th>
                <th className={`${TH} text-right`}>Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading ? (
                <AdminTableSkeleton cols={6} rows={3} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState compact icon={<UtensilsCrossed size={22} />} title="Geen activiteiten gevonden" />
                  </td>
                </tr>
              ) : (
                paginated.map((meal) => {
                  const isSelected = selectedIds.has(meal.id);
                  return (
                    <tr key={meal.id} className={isSelected ? TR_SELECTED : TR}>
                      <td className={`${TD} w-10 !pr-2`} onClick={(e) => { e.stopPropagation(); toggleSelect(meal.id); }}>
                        <RowCheckbox checked={isSelected} onChange={() => toggleSelect(meal.id)} label={`Selecteer ${meal.meal_name}`} />
                      </td>
                      <td className={`cell-main ${TD}`}>
                        <p className="truncate text-sm font-semibold text-ink">{meal.meal_name}</p>
                        {meal.location && (
                          <div className="mt-0.5 flex items-center gap-1">
                            <MapPin size={12} className="shrink-0 text-ink-3" />
                            <span className="truncate text-xs text-ink-3">{meal.location}</span>
                          </div>
                        )}
                        {/* On a phone the other columns are hidden; the row is these lines. */}
                        <p className="mt-0.5 text-xs text-ink-3 sm:hidden">
                          {formatDateTime(meal.time)} · {formatAmount(meal.cost)}
                        </p>
                      </td>
                      <td className={`hidden sm:table-cell ${TD}`}>
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} className="shrink-0 text-ink-3" />
                          <span className="whitespace-nowrap font-mono text-sm text-ink-2">{formatDateTime(meal.time)}</span>
                        </div>
                      </td>
                      <td className={`hidden sm:table-cell ${TD}`}>
                        <span className="font-mono text-sm tabular-nums text-ink-2">{formatAmount(meal.cost)}</span>
                        {meal.transport_needed && (
                          <div className="mt-0.5 flex items-center gap-1">
                            <Bus size={12} className="text-ink-3" />
                            <span className="text-xs text-ink-3">Vervoer nodig</span>
                          </div>
                        )}
                      </td>
                      <td className={`hidden sm:table-cell ${TD}`}>
                        {meal.participants.length === 0 ? (
                          <span className="text-xs text-ink-3">—</span>
                        ) : (
                          <AvatarStack names={meal.participants} size="sm" max={4} />
                        )}
                      </td>
                      <td className={`cell-actions ${TD}`}>
                        <DeleteConfirmActions
                          id={meal.id}
                          confirmId={confirmDeleteId}
                          isPending={deleteMutation.isPending}
                          onEdit={() => setDrawer(meal)}
                          onRequestDelete={() => setConfirmDeleteId(meal.id)}
                          onConfirmDelete={() => handleDelete(meal.id, meal.meal_name)}
                          onCancelDelete={() => setConfirmDeleteId(null)}
                          editLabel={`${meal.meal_name} bewerken`}
                          deleteLabel={`${meal.meal_name} verwijderen`}
                        />
                      </td>
                    </tr>
                  );
                })
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
    </AdminPage>
  );
}
