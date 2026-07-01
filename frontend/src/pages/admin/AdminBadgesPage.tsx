import { useState, useRef, useEffect } from "react";
import { Plus, ShieldCheck, Users, Upload, Link, GripVertical } from "lucide-react";
import {
  useAdminBadges,
  useCreateBadge,
  useUpdateBadge,
  useDeleteBadge,
  useReorderBadges,
  useAssignBadge,
  useUnassignBadge,
} from "../../hooks/useBadges";
import { useAdminUsers } from "../../hooks/useAdmin";
import { uploadBadgeImage } from "../../services/badges.service";
import { AdminDrawer } from "./AdminDrawer";
import { AdminPageHeader } from "./components/AdminPageHeader";
import { AdminSearch } from "./components/AdminSearch";
import { AdminTableSkeleton } from "./components/AdminTableSkeleton";
import { AdminPagination } from "./components/AdminPagination";
import { DeleteConfirmActions } from "./components/DeleteConfirmActions";
import { F, L, SECTION, SECTION_TITLE } from "./styles";
import { toast } from "../../store/toast.store";
import type { Badge, User } from "../../types";

const PAGE_SIZE = 15;

// ── Badge drawer (create / edit) ───────────────────────────────────────────────

interface BadgeFormState {
  name: string;
  description: string;
  image_url: string;
  display_order: number;
}

const EMPTY: BadgeFormState = { name: "", description: "", image_url: "", display_order: 0 };

function BadgeDrawer({
  badge,
  onClose,
}: {
  badge: Badge | "new" | null;
  onClose: () => void;
}) {
  const isEdit = badge !== null && badge !== "new";
  const open = badge !== null;

  const createBadge = useCreateBadge();
  const updateBadge = useUpdateBadge();

  const [form, setForm] = useState<BadgeFormState>(
    isEdit
      ? { name: badge.name, description: badge.description, image_url: badge.image_url, display_order: badge.display_order }
      : EMPTY,
  );
  const [uploading, setUploading] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof BadgeFormState) => (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast("error", "Alleen afbeeldingen zijn toegestaan.");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadBadgeImage(file);
      setForm((f) => ({ ...f, image_url: url }));
    } catch {
      toast("error", "Upload mislukt. Controleer de storage bucket.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!form.name || !form.description || !form.image_url) return;
    try {
      if (isEdit) {
        await updateBadge.mutateAsync({ id: badge.id, ...form });
        toast("success", `${form.name} bijgewerkt.`);
      } else {
        await createBadge.mutateAsync(form);
        toast("success", `${form.name} aangemaakt.`);
      }
      onClose();
    } catch {
      toast("error", "Kon badge niet opslaan.");
    }
  }

  const isSaving = createBadge.isPending || updateBadge.isPending;
  const isPending = isSaving || uploading;
  const isValid = !!form.name && !!form.description && !!form.image_url;

  return (
    <AdminDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Badge bewerken" : "Nieuwe badge"}
      subtitle={isEdit ? badge.name : "Voeg een nieuwe badge toe"}
      footer={
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={!isValid || isPending}
            className="flex-1 rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? "Opslaan..." : isEdit ? "Bijwerken" : "Aanmaken"}
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
        <p className={SECTION_TITLE}>Badge details</p>
        <div>
          <label className={L}>Naam *</label>
          <input className={F} value={form.name} onChange={set("name")} placeholder="bijv. Reisleider" />
        </div>
        <div>
          <label className={L}>Omschrijving (tooltip) *</label>
          <input
            className={F}
            value={form.description}
            onChange={set("description")}
            placeholder="bijv. Verantwoordelijk voor de reisgroep"
          />
        </div>
        {/* Image input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={L}>Afbeelding *</label>
            <button
              type="button"
              onClick={() => setUrlMode((v) => !v)}
              className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-sky-400 transition-colors"
            >
              {urlMode ? <><Upload size={10} /> Upload</> : <><Link size={10} /> URL invoeren</>}
            </button>
          </div>

          {urlMode ? (
            <input
              className={F}
              value={form.image_url}
              onChange={set("image_url")}
              placeholder="https://..."
            />
          ) : (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files[0];
                  if (file) handleFile(file);
                }}
                disabled={uploading}
                className={`w-full rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors ${
                  dragOver
                    ? "border-sky-500 bg-sky-500/10"
                    : "border-white/[0.12] bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05]"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {uploading ? (
                  <p className="text-xs text-slate-400">Uploaden...</p>
                ) : (
                  <>
                    <Upload size={18} className="mx-auto mb-1.5 text-slate-500" />
                    <p className="text-xs font-medium text-slate-400">
                      Klik of sleep een afbeelding hierheen
                    </p>
                    <p className="text-[10px] text-slate-600 mt-0.5">PNG, JPG, GIF, WebP</p>
                  </>
                )}
              </button>
            </>
          )}

          {form.image_url && (
            <div className="mt-2 flex items-center gap-2">
              <img
                src={form.image_url}
                alt="preview"
                className="h-9 w-9 rounded-full object-cover border border-white/10"
              />
              <span className="text-xs text-slate-500">Preview</span>
            </div>
          )}
        </div>
      </div>
    </AdminDrawer>
  );
}

// ── Assignment drawer ──────────────────────────────────────────────────────────

function AssignDrawer({
  open,
  onClose,
  users,
  badges,
}: {
  open: boolean;
  onClose: () => void;
  users: User[];
  badges: Badge[];
}) {
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const assign = useAssignBadge();
  const unassign = useUnassignBadge();

  // Always derive from live users data so badge_ids stay fresh after mutations
  const selectedUser = users.find((u) => u.id === selectedUserId) ?? null;

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.aliases?.some((a) => a.toLowerCase().includes(q))
    );
  });

  function toggle(user: User, badge: Badge) {
    if (!user.id) return;
    const has = (user.badge_ids ?? []).includes(badge.id);
    if (has) {
      unassign.mutate({ userId: user.id, badgeId: badge.id });
    } else {
      assign.mutate({ userId: user.id, badgeId: badge.id });
    }
  }

  return (
    <AdminDrawer
      open={open}
      onClose={onClose}
      title="Badges toewijzen"
      subtitle="Selecteer een gebruiker en wijs badges toe"
    >
      <div className="space-y-4">
        {/* User search */}
        <div className={SECTION}>
          <p className={SECTION_TITLE}>Gebruiker zoeken</p>
          <input
            className={F}
            placeholder="Zoek op naam of alias..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="space-y-1 max-h-56 overflow-y-auto -mx-1 px-1">
            {filtered.length === 0 && (
              <p className="py-4 text-center text-xs text-slate-500">Geen gebruikers gevonden.</p>
            )}
            {filtered.map((user) => (
              <button
                key={user.id}
                onClick={() =>
                  setSelectedUserId(selectedUserId === user.id ? null : user.id ?? null)
                }
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  selectedUserId === user.id
                    ? "bg-sky-500/10 border border-sky-500/30"
                    : "hover:bg-white/[0.04] border border-transparent"
                }`}
              >
                <span className="text-sm font-medium text-white flex-1 truncate">
                  {user.name}
                </span>
                {(user.badge_ids ?? []).length > 0 && (
                  <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 rounded-full px-2 py-0.5">
                    {(user.badge_ids ?? []).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Badge grid for selected user */}
        {selectedUser && (
          <div className={SECTION}>
            <p className={SECTION_TITLE}>
              Badges van{" "}
              <span className="text-slate-300 normal-case">{selectedUser.name}</span>
            </p>

            {badges.length === 0 && (
              <p className="py-2 text-xs text-slate-500">Nog geen badges beschikbaar.</p>
            )}

            <div className="grid grid-cols-2 gap-2">
              {badges.map((badge) => {
                const has = (selectedUser.badge_ids ?? []).includes(badge.id);
                return (
                  <button
                    key={badge.id}
                    onClick={() => toggle(selectedUser, badge)}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left border transition-all ${
                      has
                        ? "bg-sky-500/10 border-sky-500/30"
                        : "bg-white/[0.03] border-white/[0.08] hover:border-white/20"
                    }`}
                  >
                    <img
                      src={badge.image_url}
                      alt={badge.name}
                      className="h-7 w-7 rounded-full object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{badge.name}</p>
                      {has && (
                        <p className="text-[10px] text-sky-400 font-medium">Toegewezen</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AdminDrawer>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function AdminBadgesPage() {
  const { data: badges = [], isLoading: badgesLoading } = useAdminBadges();
  const { data: users = [], isLoading: usersLoading } = useAdminUsers();
  const deleteBadge = useDeleteBadge();
  const reorderBadgesMutation = useReorderBadges();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [drawer, setDrawer] = useState<Badge | "new" | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Local sorted list — drives the table; synced from server when not dragging
  const [items, setItems] = useState<Badge[]>([]);
  const dragId = useRef<string | null>(null);
  const dragOverId = useRef<string | null>(null);

  useEffect(() => {
    // Only sync from server when we're not mid-drag
    if (!dragId.current) setItems(badges);
  }, [badges]);

  const isLoading = badgesLoading || usersLoading;

  const filtered = items.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return b.name.toLowerCase().includes(q) || b.description.toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(0, totalPages - 1));
  const paginated = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  function handleSearch(v: string) {
    setSearch(v);
    setPage(0);
  }

  async function handleDelete(id: string, name: string) {
    try {
      await deleteBadge.mutateAsync(id);
      toast("success", `${name} verwijderd.`);
      setConfirmDeleteId(null);
    } catch {
      toast("error", "Kon badge niet verwijderen.");
    }
  }

  // ── Drag handlers ───────────────────────────────────────────────────────────

  function onDragStart(id: string) {
    dragId.current = id;
  }

  function onDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    dragOverId.current = id;
  }

  function onDrop() {
    const from = dragId.current;
    const to = dragOverId.current;
    dragId.current = null;
    dragOverId.current = null;

    if (!from || !to || from === to) return;

    const next = [...items];
    const fromIdx = next.findIndex((b) => b.id === from);
    const toIdx = next.findIndex((b) => b.id === to);
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);

    const reordered = next.map((b, i) => ({ ...b, display_order: i }));
    setItems(reordered);
    reorderBadgesMutation.mutate(reordered.map((b) => ({ id: b.id, display_order: b.display_order })));
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-5 lg:p-8 max-w-6xl mx-auto space-y-5">
      <AdminPageHeader
        title="Badges"
        subtitle={`${badges.length} badge${badges.length !== 1 ? "s" : ""}`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAssignOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-800/60 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.06] transition-colors shadow-sm"
            >
              <Users size={15} />
              Toewijzen
            </button>
            <button
              onClick={() => setDrawer("new")}
              className="flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition-colors shadow-sm"
            >
              <Plus size={16} />
              Nieuwe badge
            </button>
          </div>
        }
      />

      <AdminSearch
        value={search}
        onChange={handleSearch}
        placeholder="Zoek op naam of omschrijving..."
      />

      <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.06] bg-white dark:bg-slate-800/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06] bg-slate-50/80 dark:bg-slate-900/40">
                <th className="w-8 px-3 py-3" />
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Badge
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Omschrijving
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Toegewezen aan
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Acties
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {isLoading ? (
                <AdminTableSkeleton cols={5} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <ShieldCheck size={28} className="opacity-30" />
                      <p className="text-sm">
                        {search ? "Geen badges gevonden." : "Nog geen badges aangemaakt."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((badge) => {
                  const assignedCount = users.filter((u) =>
                    (u.badge_ids ?? []).includes(badge.id),
                  ).length;

                  return (
                    <tr
                      key={badge.id}
                      draggable
                      onDragStart={() => onDragStart(badge.id)}
                      onDragOver={(e) => onDragOver(e, badge.id)}
                      onDrop={onDrop}
                      onDragEnd={() => { dragId.current = null; }}
                      className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="pl-3 pr-1 py-3.5 cursor-grab active:cursor-grabbing">
                        <GripVertical size={16} className="text-slate-300 dark:text-slate-600" />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={badge.image_url}
                            alt={badge.name}
                            className="h-9 w-9 rounded-full object-cover border border-slate-200 dark:border-white/10 shrink-0"
                          />
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {badge.name}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate">
                          {badge.description}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        {assignedCount > 0 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 dark:bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:text-sky-400">
                            <Users size={10} />
                            {assignedCount}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td
                        className="px-5 py-3.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DeleteConfirmActions
                          id={badge.id}
                          confirmId={confirmDeleteId}
                          isPending={deleteBadge.isPending}
                          onEdit={() => setDrawer(badge)}
                          onRequestDelete={() => setConfirmDeleteId(badge.id)}
                          onConfirmDelete={() => handleDelete(badge.id, badge.name)}
                          onCancelDelete={() => setConfirmDeleteId(null)}
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

      {/* Create / edit drawer */}
      <BadgeDrawer
        key={typeof drawer === "object" && drawer !== null ? drawer.id : (drawer ?? "none")}
        badge={drawer}
        onClose={() => setDrawer(null)}
      />

      {/* Assignment drawer */}
      <AssignDrawer
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        users={users}
        badges={badges}
      />
    </div>
  );
}
