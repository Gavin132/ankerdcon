import { useState } from "react";
import { ArrowDown, ArrowUp, Check, Plus, X } from "lucide-react";
import {
  useAdminMealCategories,
  useAdminCreateMealCategory,
  useAdminUpdateMealCategory,
  useAdminDeleteMealCategory,
} from "../../hooks/useAdmin";
import { ApiError } from "../../lib/api/client";
import { toast } from "../../store/toast.store";
import type { MealCategory } from "../../types";
import { F } from "./styles";
import { AdminPage } from "./components/AdminPage";
import { AdminPageHeader } from "./components/AdminPageHeader";
import { DeleteConfirmActions } from "./components/DeleteConfirmActions";

type Flag = "has_signup" | "has_cost" | "has_transport" | "is_meal";

/** What each switch means, in the words an admin thinks in. */
const FLAGS: { key: Flag; label: string; hint: string }[] = [
  { key: "has_signup", label: "Aanmelden", hint: "Mensen kunnen zich aanmelden" },
  { key: "has_cost", label: "Prijs", hint: "Een bedrag per persoon" },
  { key: "has_transport", label: "Vervoer", hint: "Er kan een rit naartoe geregeld worden" },
  { key: "is_meal", label: "Telt als eten", hint: "Menu en dieetwensen, en meetellen bij “nergens bij”" },
];

function FlagToggle({
  flag,
  on,
  disabled,
  onToggle,
}: {
  flag: (typeof FLAGS)[number];
  on: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      title={flag.hint}
      disabled={disabled}
      onClick={onToggle}
      // Several of these are on at once, so "on" is a soft tint and a tick, not the ink fill of a filter chip.
      className={`chip disabled:opacity-50 ${on ? "border-transparent bg-brand-soft text-brand-text" : "chip-off"}`}
    >
      {/* The tick says "on" without leaning on the colour alone */}
      {on && <Check size={14} />}
      {flag.label}
    </button>
  );
}

/** Admin › Activiteiten › Categorieën: the kinds of activity members can pick, and what each one has. */
export function AdminMealCategoriesPage() {
  const { data: categories = [], isLoading } = useAdminMealCategories();
  const createMutation = useAdminCreateMealCategory();
  const updateMutation = useAdminUpdateMealCategory();
  const deleteMutation = useAdminDeleteMealCategory();

  const [newName, setNewName] = useState("");
  const [newFlags, setNewFlags] = useState<Record<Flag, boolean>>({
    has_signup: true,
    has_cost: true,
    has_transport: true,
    is_meal: false,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const apiMessage = (err: unknown, fallback: string) => (err instanceof ApiError && err.message ? err.message : fallback);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    try {
      await createMutation.mutateAsync({ name, ...newFlags });
      setNewName("");
      toast("success", `Categorie "${name}" aangemaakt.`);
    } catch (err) {
      toast("error", apiMessage(err, "Kon categorie niet aanmaken."));
    }
  }

  async function saveName(id: string) {
    const name = editingName.trim();
    if (!name) return;
    try {
      await updateMutation.mutateAsync({ id, payload: { name } });
      setEditingId(null);
      toast("success", "Categorie bijgewerkt.");
    } catch (err) {
      toast("error", apiMessage(err, "Kon categorie niet bijwerken."));
    }
  }

  async function toggle(category: MealCategory, flag: Flag) {
    try {
      await updateMutation.mutateAsync({ id: category.id, payload: { [flag]: !category[flag] } });
    } catch (err) {
      toast("error", apiMessage(err, "Kon categorie niet bijwerken."));
    }
  }

  async function move(index: number, by: -1 | 1) {
    const order = [...categories];
    const [moved] = order.splice(index, 1);
    order.splice(index + by, 0, moved);
    try {
      // Number them by position, so ties or gaps from earlier edits cannot leave the order unclear.
      await Promise.all(
        order.flatMap((c, i) => (c.sort_order === i ? [] : [updateMutation.mutateAsync({ id: c.id, payload: { sort_order: i } })])),
      );
    } catch (err) {
      toast("error", apiMessage(err, "Kon de volgorde niet opslaan."));
    }
  }

  async function handleDelete(category: MealCategory) {
    try {
      await deleteMutation.mutateAsync(category.id);
      setConfirmDeleteId(null);
      toast("success", `Categorie "${category.name}" verwijderd.`);
    } catch (err) {
      setConfirmDeleteId(null);
      toast("error", apiMessage(err, "Kon categorie niet verwijderen."));
    }
  }

  return (
    <AdminPage width="narrow">
      <AdminPageHeader
        title="Categorieën"
        subtitle={`${categories.length} ${categories.length === 1 ? "soort" : "soorten"} activiteit. De bovenste staat voorgeselecteerd bij een nieuwe activiteit.`}
      />

      <form onSubmit={handleCreate} className="card-surface space-y-3 p-4">
        <div className="flex gap-2">
          <input
            aria-label="Naam van de nieuwe categorie"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className={`${F} flex-1`}
            placeholder="Nieuwe categorie…"
            maxLength={40}
          />
          <button
            type="submit"
            disabled={!newName.trim() || createMutation.isPending}
            className="btn-primary min-h-[44px] gap-2 px-4 py-2.5 text-sm"
          >
            <Plus size={16} />
            Aanmaken
          </button>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Wat heeft de nieuwe categorie">
          {FLAGS.map((f) => (
            <FlagToggle key={f.key} flag={f} on={newFlags[f.key]} onToggle={() => setNewFlags((v) => ({ ...v, [f.key]: !v[f.key] }))} />
          ))}
        </div>
      </form>

      <div className="card-surface divide-y divide-line overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-sunken" />)}
          </div>
        ) : categories.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-3">
            Nog geen categorieën. Voeg de eerste toe.
          </p>
        ) : (
          categories.map((category, index) => (
            <div key={category.id} className="space-y-2.5 px-4 py-3.5">
              <div className="flex items-center gap-2">
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    aria-label={`${category.name} omhoog`}
                    disabled={index === 0 || updateMutation.isPending}
                    onClick={() => move(index, -1)}
                    className="icon-btn"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label={`${category.name} omlaag`}
                    disabled={index === categories.length - 1 || updateMutation.isPending}
                    onClick={() => move(index, 1)}
                    className="icon-btn"
                  >
                    <ArrowDown size={16} />
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  {editingId === category.id ? (
                    <input
                      autoFocus
                      aria-label="Naam"
                      value={editingName}
                      maxLength={40}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveName(category.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className={`${F} max-w-xs`}
                    />
                  ) : (
                    <span className="block truncate text-sm font-semibold text-ink">{category.name}</span>
                  )}
                </div>

                {editingId === category.id ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Opslaan"
                      title="Opslaan"
                      onClick={() => saveName(category.id)}
                      disabled={updateMutation.isPending}
                      className="icon-btn"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      type="button"
                      aria-label="Annuleren"
                      title="Annuleren"
                      onClick={() => setEditingId(null)}
                      className="icon-btn"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <DeleteConfirmActions
                    id={category.id}
                    confirmId={confirmDeleteId}
                    isPending={deleteMutation.isPending}
                    editLabel={`${category.name} hernoemen`}
                    deleteLabel={`${category.name} verwijderen`}
                    onEdit={() => {
                      setEditingId(category.id);
                      setEditingName(category.name);
                    }}
                    onRequestDelete={() => setConfirmDeleteId(category.id)}
                    onConfirmDelete={() => handleDelete(category)}
                    onCancelDelete={() => setConfirmDeleteId(null)}
                  />
                )}
              </div>

              <div className="flex flex-wrap gap-2" role="group" aria-label={`Wat heeft ${category.name}`}>
                {FLAGS.map((f) => (
                  <FlagToggle
                    key={f.key}
                    flag={f}
                    on={category[f.key]}
                    disabled={updateMutation.isPending}
                    onToggle={() => toggle(category, f.key)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </AdminPage>
  );
}
