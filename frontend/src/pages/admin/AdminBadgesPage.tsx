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
import { AdminPage } from "./components/AdminPage";
import { AdminPageHeader } from "./components/AdminPageHeader";
import { DrawerFooter } from "./components/DrawerFooter";
import { AdminSearch } from "./components/AdminSearch";
import { AdminTableSkeleton } from "./components/AdminTableSkeleton";
import { AdminPagination } from "./components/AdminPagination";
import { DeleteConfirmActions } from "./components/DeleteConfirmActions";
import { DiscardChangesConfirm } from "./components/DiscardChangesConfirm";
import { useConfirmDiscard } from "../../hooks/useConfirmDiscard";
import { F, L, SECTION, SECTION_TITLE, TH, TD, TR, PILL_NEUTRAL } from "./styles";
import { toast } from "../../store/toast.store";
import type { Badge, User } from "../../types";
import { EmptyState } from "../../components/common/EmptyState";

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
      toast("error", "Kon de afbeelding niet uploaden. Probeer het opnieuw.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
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
      toast("error", "Kon de badge niet opslaan. Probeer het opnieuw.");
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
      subtitle={isEdit ? badge.name : "Een nieuwe badge"}
      footer={
        <DrawerFooter
          onCancel={requestClose}
          formId="badge-form"
          isPending={isPending}
          isEdit={isEdit}
          disabled={!isValid}
        />
      }
    >
      <form id="badge-form" onSubmit={handleSave} className="space-y-4">
        <div>
          <label className={L}>Naam *</label>
          <input className={F} value={form.name} onChange={set("name")} placeholder="Bijvoorbeeld: Reisleider" />
        </div>
        <div>
          <label className={L}>Omschrijving (tooltip) *</label>
          <input
            className={F}
            value={form.description}
            onChange={set("description")}
            placeholder="Bijvoorbeeld: verantwoordelijk voor de reisgroep"
          />
        </div>
        {/* Image input */}
        <div>
          <div className="flex items-center justify-between">
            <label className={`${L} !mb-0`}>Afbeelding *</label>
            <button
              type="button"
              onClick={() => setUrlMode((v) => !v)}
              className="hit-area flex items-center gap-1 text-xs text-ink-3 hover:text-brand-text transition-colors"
            >
              {urlMode ? <><Upload size={14} /> Upload</> : <><Link size={14} /> URL invoeren</>}
            </button>
          </div>

          {urlMode ? (
            <input
              className={F}
              value={form.image_url}
              onChange={set("image_url")}
              placeholder="https://…"
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
                className={`w-full rounded-xl border-1.5 border-dashed px-4 py-5 text-center transition-colors ${
                  dragOver
                    ? "border-brand-text bg-brand-soft"
                    : "border-line bg-paper hover:border-ink-3 hover:bg-sunken"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {uploading ? (
                  <p className="text-xs text-ink-3">Uploaden…</p>
                ) : (
                  <>
                    <Upload size={16} className="mx-auto mb-1.5 text-ink-3" />
                    <p className="text-xs font-medium text-ink-3">
                      Klik of sleep een afbeelding hierheen
                    </p>
                    <p className="text-xs text-ink-3 mt-0.5">PNG, JPG, GIF, WebP</p>
                  </>
                )}
              </button>
            </>
          )}

          {form.image_url && (
            <div className="mt-2 flex items-center gap-2">
              <img
                src={form.image_url}
                alt="Voorbeeld"
                className="h-9 w-9 rounded-full object-cover border border-line"
              />
              <span className="text-xs text-ink-3">Voorbeeld</span>
            </div>
          )}
        </div>
      </form>
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
      subtitle="Kies een gebruiker en wijs badges toe"
    >
      <div className="space-y-4">
        {/* User search */}
        <div className={SECTION}>
          <p className={SECTION_TITLE}>Gebruiker zoeken</p>
          <input
            className={F}
            placeholder="Zoek op naam of alias…"
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
                  <span className="pill pill-neutral font-mono tabular-nums">
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
                        <p className="text-xs font-medium text-ink-2">Toegewezen</p>
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
              className="flex items-center gap-2.5 rounded-xl border border-line bg-paper py-0.5 pl-3 pr-1.5"
            >
              <UserAvatar name={u.name} user={u} className="h-7 w-7 text-[9px]" />
              <span className="flex-1 text-sm text-ink">{u.name}</span>
              <button
                type="button"
                onClick={() => u.id && badge && unassign.mutate({ userId: u.id, badgeId: badge.id })}
                disabled={unassign.isPending}
                className="icon-btn text-ink-3 hover:!bg-bad-soft hover:!text-bad"
                title="Badge afnemen"
                aria-label={`Badge van ${u.name} afnemen`}
              >
                <UserX size={16} />
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
      toast("error", "Kon de badge niet verwijderen. Probeer het opnieuw.");
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
    <AdminPage>
      <AdminPageHeader
        title="Badges"
        subtitle={`${badges.length} ${badges.length === 1 ? "badge" : "badges"}`}
        action={
          <>
            <button
              onClick={() => setAssignOpen(true)}
              className="btn-primary px-4"
            >
              <Users size={16} />
              Toewijzen
            </button>
            <button
              onClick={() => setDrawer("new")}
              className="btn-primary gap-2 px-4"
            >
              <Plus size={16} />
              Nieuwe badge
            </button>
          </>
        }
      />

      <AdminSearch
        value={search}
        onChange={handleSearch}
        placeholder="Zoek op naam of omschrijving…"
      />

      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="stack-table w-full">
            <thead>
              <tr>
                <th className={`${TH} hidden w-8 !pr-1 sm:table-cell`}>
                  <span className="sr-only">Volgorde</span>
                </th>
                <th className={TH}>Badge</th>
                <th className={`${TH} hidden sm:table-cell`}>Omschrijving</th>
                <th className={TH}>Toegewezen aan</th>
                <th className={`${TH} text-right`}>Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading ? (
                <AdminTableSkeleton cols={5} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState compact icon={<ShieldCheck size={22} />} title={search ? "Geen badges gevonden" : "Nog geen badges aangemaakt"} />
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
                      className={TR}
                    >
                      {/* Drag to reorder: a mouse thing, so not on a phone */}
                      <td className={`hidden cursor-grab !pr-1 active:cursor-grabbing sm:table-cell ${TD} w-8`}>
                        <GripVertical size={16} className="text-ink-3" aria-hidden />
                      </td>
                      <td className={`cell-main ${TD}`}>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <img
                            src={badge.image_url}
                            alt={badge.name}
                            className="h-7 w-7 shrink-0 rounded-full border border-line object-cover sm:h-9 sm:w-9"
                          />
                          <p className="truncate text-sm font-semibold text-ink">
                            {badge.name}
                          </p>
                        </div>
                      </td>
                      <td className={`hidden sm:table-cell ${TD}`}>
                        <p className="max-w-xs truncate text-sm text-ink-3">
                          {badge.description}
                        </p>
                      </td>
                      <td className={TD}>
                        {assignedCount > 0 ? (
                          <button
                            type="button"
                            onClick={() => setViewingBadge(badge)}
                            aria-label={`${assignedCount} ${assignedCount === 1 ? "gebruiker heeft" : "gebruikers hebben"} ${badge.name}, bekijk wie`}
                            className={`hit-area ${PILL_NEUTRAL} tabular-nums transition-colors hover:bg-line hover:text-ink`}
                          >
                            <Users size={14} />
                            {assignedCount}
                          </button>
                        ) : (
                          <span className="text-xs text-ink-3">—</span>
                        )}
                      </td>
                      <td className={`cell-actions ${TD}`}>
                        <DeleteConfirmActions
                          id={badge.id}
                          confirmId={confirmDeleteId}
                          isPending={deleteBadge.isPending}
                          onEdit={() => setDrawer(badge)}
                          onRequestDelete={() => setConfirmDeleteId(badge.id)}
                          onConfirmDelete={() => handleDelete(badge.id, badge.name)}
                          onCancelDelete={() => setConfirmDeleteId(null)}
                          editLabel={`${badge.name} bewerken`}
                          deleteLabel={`${badge.name} verwijderen`}
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
    </AdminPage>
  );
}
