import { useState, useRef, useEffect } from "react";
import { Plus, ShieldCheck, Users, Upload, Link, GripVertical, UserX } from "lucide-react";
import { UserAvatar } from "../../components/common/UserAvatar";
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
import { DiscardChangesConfirm } from "./components/DiscardChangesConfirm";
import { useConfirmDiscard } from "../../hooks/useConfirmDiscard";
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

  const initialForm = useRef<BadgeFormState>(
    isEdit
      ? { name: badge.name, description: badge.description, image_url: badge.image_url, display_order: badge.display_order }
      : EMPTY,
  );
  const [form, setForm] = useState<BadgeFormState>(initialForm.current);
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
  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm.current);
  const { requestClose, confirming, confirmDiscard, cancelDiscard } = useConfirmDiscard(isDirty, onClose);

  return (
    <>
    <AdminDrawer
      open={open}
      onClose={requestClose}
      title={isEdit ? "Badge bewerken" : "Nieuwe badge"}
      subtitle={isEdit ? badge.name : "Voeg een nieuwe badge toe"}
      footer={
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={!isValid || isPending}
            className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Opslaan..." : isEdit ? "Bijwerken" : "Aanmaken"}
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
              className="flex items-center gap-1 text-[10px] text-ink-3 hover:text-brand-text transition-colors"
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
                    ? "border-brand-text bg-brand-soft"
                    : "border-line bg-paper hover:border-ink-3 hover:bg-sunken"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {uploading ? (
                  <p className="text-xs text-ink-3">Uploaden...</p>
                ) : (
                  <>
                    <Upload size={18} className="mx-auto mb-1.5 text-ink-3" />
                    <p className="text-xs font-medium text-ink-3">
                      Klik of sleep een afbeelding hierheen
                    </p>
                    <p className="text-[10px] text-ink-3 mt-0.5">PNG, JPG, GIF, WebP</p>
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
                className="h-9 w-9 rounded-full object-cover border border-line"
              />
              <span className="text-xs text-ink-3">Preview</span>
            </div>
          )}
        </div>
      </div>
    </AdminDrawer>
    <DiscardChangesConfirm open={confirming} onCancel={cancelDiscard} onConfirm={confirmDiscard} />
    </>
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
              <p className="py-4 text-center text-xs text-ink-3">Geen gebruikers gevonden.</p>
            )}
            {filtered.map((user) => (
              <button
                key={user.id}
                onClick={() =>
                  setSelectedUserId(selectedUserId === user.id ? null : user.id ?? null)
                }
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  selectedUserId === user.id
                    ? "border-1.5 border-outline bg-brand-soft"
                    : "border-1.5 border-transparent hover:bg-sunken"
                }`}
              >
                <span className="flex-1 truncate text-sm font-medium text-ink">
                  {user.name}
                </span>
                {(user.badge_ids ?? []).length > 0 && (
                  <span className="rounded-full bg-sunken px-2 py-0.5 font-mono text-[10.5px] font-semibold tabular-nums text-ink-2">
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
              <span className="text-ink-2 normal-case">{selectedUser.name}</span>
            </p>

            {badges.length === 0 && (
              <p className="py-2 text-xs text-ink-3">Nog geen badges beschikbaar.</p>
            )}

            <div className="grid grid-cols-2 gap-2">
              {badges.map((badge) => {
                const has = (selectedUser.badge_ids ?? []).includes(badge.id);
                return (
                  <button
                    key={badge.id}
                    onClick={() => toggle(selectedUser, badge)}
                    className={`flex items-center gap-2.5 rounded-xl border-1.5 px-3 py-2.5 text-left transition-colors ${
                      has
                        ? "border-outline bg-brand-soft"
                        : "border-line bg-paper hover:border-ink-3"
                    }`}
                  >
                    <img
                      src={badge.image_url}
                      alt={badge.name}
                      className="h-7 w-7 rounded-full object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-ink">{badge.name}</p>
                      {has && (
                        <p className="text-[10px] font-medium text-ink-2">Toegewezen</p>
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

// ── Badge members drawer ────────────────────────────────────────────────────────

function BadgeMembersDrawer({
  badge,
  users,
  onClose,
}: {
  badge: Badge | null;
  users: User[];
  onClose: () => void;
}) {
  const unassign = useUnassignBadge();

  const members = badge
    ? users.filter((u) => (u.badge_ids ?? []).includes(badge.id))
    : [];

  return (
    <AdminDrawer
      open={badge !== null}
      onClose={onClose}
      title={badge?.name ?? ""}
      subtitle={`${members.length} ${members.length === 1 ? "gebruiker" : "gebruikers"} toegewezen`}
    >
      {members.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-3">Nog niemand heeft deze badge.</p>
      ) : (
        <div className="space-y-1.5">
          {members.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-2.5 rounded-xl border border-line bg-paper px-3 py-2"
            >
              <UserAvatar name={u.name} user={u} className="h-7 w-7 text-[9px]" />
              <span className="flex-1 text-sm text-ink">{u.name}</span>
              <button
                type="button"
                onClick={() => u.id && badge && unassign.mutate({ userId: u.id, badgeId: badge.id })}
                disabled={unassign.isPending}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-3 hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-500/15 dark:hover:text-rose-300 disabled:opacity-40 transition-colors"
                title="Badge verwijderen"
              >
                <UserX size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
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
  const [viewingBadge, setViewingBadge] = useState<Badge | null>(null);
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
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <AdminPageHeader
        title="Badges"
        subtitle={`${badges.length} badge${badges.length !== 1 ? "s" : ""}`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAssignOpen(true)}
              className="flex items-center gap-2 rounded-xl border-1.5 border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink-3"
            >
              <Users size={15} />
              Toewijzen
            </button>
            <button
              onClick={() => setDrawer("new")}
              className="btn-primary gap-2 px-4 py-2.5 text-sm"
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

      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-1.5 border-line">
                <th className="w-6 sm:w-8 px-1.5 sm:px-3 py-2.5 sm:py-3" />
                <th className="px-2.5 sm:px-5 py-2.5 sm:py-3 text-left whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[0.09em] text-ink-3">
                  Badge
                </th>
                <th className="hidden sm:table-cell px-5 py-3 text-left whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[0.09em] text-ink-3">
                  Omschrijving
                </th>
                <th className="px-2 sm:px-5 py-2.5 sm:py-3 text-left whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[0.09em] text-ink-3">
                  Toegewezen aan
                </th>
                <th className="px-2 sm:px-5 py-2.5 sm:py-3 text-right whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[0.09em] text-ink-3">
                  Acties
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading ? (
                <AdminTableSkeleton cols={5} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-ink-3">
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-sunken text-ink-3"><ShieldCheck size={22} /></span>
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
                      className="hover:bg-sunken transition-colors"
                    >
                      <td className="pl-1.5 sm:pl-3 pr-0.5 sm:pr-1 py-2.5 sm:py-3.5 cursor-grab active:cursor-grabbing">
                        <GripVertical size={16} className="text-ink-3" />
                      </td>
                      <td className="px-2.5 sm:px-5 py-2.5 sm:py-3.5">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <img
                            src={badge.image_url}
                            alt={badge.name}
                            className="h-7 w-7 shrink-0 rounded-full border border-line object-cover sm:h-9 sm:w-9"
                          />
                          <p className="text-sm font-semibold text-ink truncate">
                            {badge.name}
                          </p>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-5 py-3.5">
                        <p className="text-sm text-ink-3 max-w-xs truncate">
                          {badge.description}
                        </p>
                      </td>
                      <td
                        className="px-2 sm:px-5 py-2.5 sm:py-3.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {assignedCount > 0 ? (
                          <button
                            type="button"
                            onClick={() => setViewingBadge(badge)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-sunken px-2 py-0.5 font-mono text-[11.5px] font-semibold tabular-nums text-ink-2 transition-colors hover:bg-line hover:text-ink"
                          >
                            <Users size={10} />
                            {assignedCount}
                          </button>
                        ) : (
                          <span className="text-xs text-ink-3">—</span>
                        )}
                      </td>
                      <td
                        className="px-2 sm:px-5 py-2.5 sm:py-3.5"
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

      {/* Badge members drawer */}
      <BadgeMembersDrawer
        badge={viewingBadge}
        users={users}
        onClose={() => setViewingBadge(null)}
      />
    </div>
  );
}
