import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Shield, ShieldOff, Plus, X, UserPlus, Ban, CheckCircle, Copy, Check } from "lucide-react";
import {
  useAdminUsers,
  useAdminCreateUser,
  useAdminUpdateUser,
  useAdminDeleteUser,
  useAdminBulkDeleteUsers,
  useAdminBulkDeactivateUsers,
} from "../../hooks/useAdmin";
import { UserAvatar } from "../../components/common/UserAvatar";
import { AdminDrawer } from "./AdminDrawer";
import { toast } from "../../store/toast.store";
import type { User } from "../../types";
import { F, L } from "./styles";
import { AdminPageHeader } from "./components/AdminPageHeader";
import { AdminSearch } from "./components/AdminSearch";
import { AdminTableSkeleton } from "./components/AdminTableSkeleton";
import { AdminPagination } from "./components/AdminPagination";
import { DeleteConfirmActions } from "./components/DeleteConfirmActions";
import { DrawerFooter } from "./components/DrawerFooter";
import { DiscardChangesConfirm } from "./components/DiscardChangesConfirm";
import { AdminBulkBar } from "./components/AdminBulkBar";
import { useTableSelection } from "../../hooks/useTableSelection";
import { useConfirmDiscard } from "../../hooks/useConfirmDiscard";

const PAGE_SIZE = 15;

// ── Create drawer ─────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(2, "Min 2 tekens").max(30, "Max 30 tekens"),
  discord_id: z.string().optional(),
  is_admin: z.boolean().optional(),
});
type CreateForm = z.infer<typeof createSchema>;

function UserCreateDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createMutation = useAdminCreateUser();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
    watch,
    setValue,
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", discord_id: "", is_admin: false },
  });
  const isAdmin = watch("is_admin");
  const { requestClose, confirming, confirmDiscard, cancelDiscard } = useConfirmDiscard(isDirty, onClose);

  async function onSubmit(values: CreateForm) {
    try {
      await createMutation.mutateAsync({
        name: values.name,
        discord_id: values.discord_id || undefined,
        is_admin: values.is_admin,
      });
      toast("success", `${values.name} toegevoegd.`);
      reset();
      onClose();
    } catch {
      toast("error", "Kon gebruiker niet aanmaken.");
    }
  }

  return (
    <>
    <AdminDrawer
      open={open}
      onClose={requestClose}
      title="Nieuwe gebruiker"
      subtitle="Voeg een gebruiker toe, met of zonder eigen account"
      footer={
        <DrawerFooter
          onCancel={requestClose}
          formId="user-create-form"
          isPending={createMutation.isPending}
          isEdit={false}
        />
      }
    >
      <form id="user-create-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className={L}>Naam *</label>
          <input
            {...register("name")}
            className={F}
            placeholder="Discord weergavenaam"
            autoFocus
          />
          {errors.name && (
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.name.message}</p>
          )}
          <p className="mt-1.5 text-[11px] text-ink-3">
            Zichtbaar voor de hele groep bij ritten, maaltijden, kamers en uitgaven.
          </p>
        </div>

        <div>
          <label className={L}>Discord ID (optioneel)</label>
          <input
            {...register("discord_id")}
            className={`${F} font-mono`}
            placeholder="123456789012345678"
          />
          <p className="mt-1.5 text-[11px] text-ink-3">
            Alleen nodig als deze persoon zelf met Discord gaat inloggen — voor een stabielere koppeling na naamwijzigingen. Laat dit leeg voor iemand zonder eigen account (bijv. iemand die niet mee wil doen aan de app); je kunt ze dan nog steeds overal aan toevoegen.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-xl border-1.5 border-line bg-paper px-4 py-3">
          <div className="flex items-center gap-2">
            <Shield size={15} className="text-ink-2" />
            <span className="text-sm font-medium text-ink">Admin-rechten</span>
          </div>
          <button
            type="button"
            onClick={() => setValue("is_admin", !isAdmin)}
            className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
              isAdmin ? "bg-ink dark:bg-brand" : "bg-line"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full transition-transform ${
                isAdmin ? "translate-x-4 bg-paper" : "bg-white dark:bg-ink-3"
              }`}
            />
          </button>
        </div>
      </form>
    </AdminDrawer>
    <DiscardChangesConfirm open={confirming} onCancel={cancelDiscard} onConfirm={confirmDiscard} />
    </>
  );
}

// ── Edit drawer ───────────────────────────────────────────────────────────────

const editSchema = z.object({
  phone_number: z.string().optional(),
  pronouns: z.string().max(40, "Max 40 tekens").optional(),
  bio: z.string().max(200, "Max 200 tekens").optional(),
  color: z
    .string()
    .regex(/^(#[0-9a-fA-F]{3,6})?$/, "Gebruik hex kleur (#rrggbb)")
    .optional(),
  is_admin: z.boolean().optional(),
});
type EditForm = z.infer<typeof editSchema>;

function UserEditDrawer({
  user,
  onClose,
}: {
  user: User | null;
  onClose: () => void;
}) {
  const updateMutation = useAdminUpdateUser();
  const initialAliases = useRef<string[]>(user?.aliases ?? []);
  const [aliases, setAliases] = useState<string[]>(initialAliases.current);
  const [aliasInput, setAliasInput] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
    setValue,
  } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      phone_number: user?.phone_number ?? "",
      pronouns: user?.pronouns ?? "",
      bio: user?.bio ?? "",
      color: user?.color ?? "",
      is_admin: user?.is_admin ?? false,
    },
  });
  const isAdmin = watch("is_admin");

  function addAlias() {
    const trimmed = aliasInput.trim();
    if (trimmed && !aliases.includes(trimmed) && aliases.length < 10) {
      setAliases([...aliases, trimmed]);
      setAliasInput("");
    }
  }

  async function onSubmit(values: EditForm) {
    try {
      await updateMutation.mutateAsync({ id: user!.id!, ...values, aliases });
      toast("success", `${user!.name} bijgewerkt.`);
      onClose();
    } catch {
      toast("error", "Kon gebruiker niet bijwerken.");
    }
  }

  const aliasesDirty = JSON.stringify(aliases) !== JSON.stringify(initialAliases.current);
  const { requestClose, confirming, confirmDiscard, cancelDiscard } =
    useConfirmDiscard(isDirty || aliasesDirty, onClose);

  return (
    <>
    <AdminDrawer
      open={!!user}
      onClose={requestClose}
      title={user?.name ?? ""}
      subtitle={
        user?.discord_username
          ? `@${user.discord_username}`
          : "Gebruiker bewerken"
      }
      footer={
        <DrawerFooter
          onCancel={requestClose}
          formId="user-edit-form"
          isPending={updateMutation.isPending}
          isEdit
        />
      }
    >
      {user && (
        <form
          id="user-edit-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
        >
          {/* Identity */}
          <div className="flex items-center gap-3 pb-4 border-b border-line">
            <UserAvatar
              name={user.name}
              className="h-12 w-12 text-sm shrink-0"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">{user.name}</p>
              <p className="text-xs text-ink-3 mt-0.5 font-mono truncate">
                {user.discord_id ?? "Geen Discord ID"}
              </p>
            </div>
          </div>

          <div>
            <label className={L}>Telefoonnummer</label>
            <input
              {...register("phone_number")}
              className={F}
              placeholder="+31 6..."
            />
          </div>

          <div>
            <label className={L}>Voornaamwoorden</label>
            <input
              {...register("pronouns")}
              className={F}
              placeholder="hij/hem"
            />
            {errors.pronouns && (
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                {errors.pronouns.message}
              </p>
            )}
          </div>

          <div>
            <label className={L}>Bio</label>
            <textarea
              {...register("bio")}
              rows={3}
              className={`${F} resize-none`}
              placeholder="Over mij..."
            />
            {errors.bio && (
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.bio.message}</p>
            )}
          </div>

          <div>
            <label className={L}>Kleur (hex)</label>
            <input
              {...register("color")}
              className={`${F} font-mono`}
              placeholder="#3b82f6"
            />
            {errors.color && (
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                {errors.color.message}
              </p>
            )}
          </div>

          {/* Aliases */}
          <div>
            <label className={L}>Aliassen</label>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={30}
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addAlias();
                  }
                }}
                className={F}
                placeholder="Bijnaam toevoegen…"
              />
              <button
                type="button"
                onClick={addAlias}
                disabled={
                  !aliasInput.trim() ||
                  aliases.includes(aliasInput.trim()) ||
                  aliases.length >= 10
                }
                className="btn-primary h-[42px] w-10 shrink-0 disabled:opacity-50"
              >
                <Plus size={14} />
              </button>
            </div>
            {aliases.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {aliases.map((a) => (
                  <span
                    key={a}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-sunken px-2.5 py-1 text-xs font-semibold text-ink-2"
                  >
                    {a}
                    <button
                      type="button"
                      onClick={() => setAliases(aliases.filter((x) => x !== a))}
                      className="text-ink-3 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="mt-1.5 text-[11px] text-ink-3">
              Zoekopdrachten in aanmeldformulieren herkennen deze namen ook.
            </p>
          </div>

          {/* Admin toggle */}
          <div className="flex items-center justify-between rounded-xl border-1.5 border-line bg-paper px-4 py-3">
            <div className="flex items-center gap-2">
              <Shield size={15} className="text-ink-2" />
              <span className="text-sm font-medium text-ink">
                Admin-rechten
              </span>
            </div>
            <button
              type="button"
              onClick={() => setValue("is_admin", !isAdmin)}
              className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
                isAdmin ? "bg-ink dark:bg-brand" : "bg-line"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full transition-transform ${
                  isAdmin ? "translate-x-4 bg-paper" : "bg-white dark:bg-ink-3"
                }`}
              />
            </button>
          </div>
        </form>
      )}
    </AdminDrawer>
    <DiscardChangesConfirm open={confirming} onCancel={cancelDiscard} onConfirm={confirmDiscard} />
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AdminUsersPage() {
  const { data: users = [], isLoading } = useAdminUsers();
  const updateMutation = useAdminUpdateUser();
  const deleteMutation = useAdminDeleteUser();
  const bulkDeleteMutation = useAdminBulkDeleteUsers();
  const bulkDeactivateMutation = useAdminBulkDeactivateUsers();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeactivateId, setConfirmDeactivateId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      (u.discord_username ?? "").toLowerCase().includes(q) ||
      (u.discord_id ?? "").includes(q) ||
      u.aliases?.some((a) => a.toLowerCase().includes(q))
    );
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(0, totalPages - 1));
  const paginated = filtered.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE,
  );

  const { selectedIds, toggleSelect, selectAll, clearSelection, allSelected, indeterminate } =
    useTableSelection(paginated.map((u) => u.id!));
  const bulkIsPending = bulkDeleteMutation.isPending || bulkDeactivateMutation.isPending;

  function handleSearch(v: string) {
    setSearch(v);
    setPage(0);
  }

  async function handleDeactivate(user: User) {
    try {
      await updateMutation.mutateAsync({ id: user.id!, is_active: false });
      toast("success", `${user.name} gedeactiveerd.`);
      setConfirmDeactivateId(null);
    } catch {
      toast("error", "Kon status niet wijzigen.");
    }
  }

  async function handleActivate(user: User) {
    try {
      await updateMutation.mutateAsync({ id: user.id!, is_active: true });
      toast("success", `${user.name} geactiveerd.`);
    } catch {
      toast("error", "Kon status niet wijzigen.");
    }
  }

  function handleCopyDiscordId(id: string, userId: string) {
    navigator.clipboard.writeText(id);
    setCopiedId(userId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleDelete(userId: string, name: string) {
    try {
      await deleteMutation.mutateAsync(userId);
      toast("success", `${name} verwijderd.`);
      setConfirmDeleteId(null);
    } catch {
      toast("error", "Kon gebruiker niet verwijderen.");
    }
  }

  async function handleBulkDelete() {
    const ids = [...selectedIds];
    try {
      await bulkDeleteMutation.mutateAsync(ids);
      toast("success", `${ids.length} gebruikers verwijderd.`);
      clearSelection();
    } catch {
      toast("error", "Kon gebruikers niet verwijderen.");
    }
  }

  async function handleBulkDeactivate() {
    const ids = [...selectedIds];
    try {
      await bulkDeactivateMutation.mutateAsync(ids);
      toast("success", `${ids.length} gebruikers gedeactiveerd.`);
      clearSelection();
    } catch {
      toast("error", "Kon gebruikers niet deactiveren.");
    }
  }

  const activeCount = users.filter((u) => u.is_active !== false).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <AdminPageHeader
        title="Gebruikers"
        subtitle={`${activeCount} actief · ${users.length} totaal`}
        action={
          <button
            onClick={() => setCreating(true)}
            className="btn-primary px-4 py-2 text-sm"
          >
            <UserPlus size={15} />
            Nieuwe gebruiker
          </button>
        }
      />

      <AdminSearch
        value={search}
        onChange={handleSearch}
        placeholder="Zoek op naam, Discord of alias..."
      />

      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-1.5 border-line text-left">
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
                  Gebruiker
                </th>
                <th className="hidden sm:table-cell px-5 py-3 text-left whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[0.09em] text-ink-3">
                  Discord ID
                </th>
                <th className="px-2 sm:px-5 py-2.5 sm:py-3 text-left whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[0.09em] text-ink-3">
                  Status
                </th>
                <th className="px-2 sm:px-5 py-2.5 sm:py-3 text-left whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[0.09em] text-ink-3">
                  Rol
                </th>
                <th className="px-2 sm:px-5 py-2.5 sm:py-3 text-right whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[0.09em] text-ink-3">
                  Acties
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading ? (
                <AdminTableSkeleton cols={6} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-sm text-ink-3"
                  >
                    Geen gebruikers gevonden.
                  </td>
                </tr>
              ) : (
                paginated.map((user) => {
                  const isActive = user.is_active !== false;
                  return (
                    <tr
                      key={user.id}
                      className={`group transition-colors ${selectedIds.has(user.id!) ? "bg-brand-soft/50 hover:bg-brand-soft/70" : "hover:bg-sunken"} ${!isActive ? "opacity-50" : ""}`}
                    >
                      <td
                        className="w-8 sm:w-10 pl-2.5 sm:pl-4 pr-1.5 sm:pr-2 py-2.5 sm:py-3.5"
                        onClick={(e) => { e.stopPropagation(); toggleSelect(user.id!); }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(user.id!)}
                          onChange={() => toggleSelect(user.id!)}
                          onClick={(e) => e.stopPropagation()}
                          className="cb"
                        />
                      </td>
                      <td className="px-2.5 sm:px-5 py-2.5 sm:py-3.5">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <UserAvatar
                            name={user.name}
                            className="h-7 w-7 sm:h-8 sm:w-8 text-[9px] sm:text-[10px] shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-ink truncate">
                              {user.name}
                            </p>
                            {user.discord_username && (
                              <p className="text-xs text-ink-3 truncate">
                                @{user.discord_username}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-ink-3 font-mono">
                            {user.discord_id ?? (
                              <span className="text-ink-3">—</span>
                            )}
                          </span>
                          {user.discord_id && (
                            <button
                              onClick={() => handleCopyDiscordId(user.discord_id!, user.id!)}
                              className="opacity-0 group-hover:opacity-100 flex h-6 w-6 items-center justify-center rounded-md text-ink-3 hover:bg-sunken hover:text-ink transition-all"
                              title="Kopieer Discord ID"
                            >
                              {copiedId === user.id ? (
                                <Check size={11} className="text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Copy size={11} />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-2 sm:px-5 py-2.5 sm:py-3.5">
                        {isActive ? (
                          <span
                            title="Actief"
                            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 p-1.5 text-[11.5px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 sm:px-2 sm:py-0.5"
                          >
                            <CheckCircle size={10} />
                            <span className="hidden sm:inline">Actief</span>
                          </span>
                        ) : (
                          <span
                            title="Inactief"
                            className="inline-flex items-center gap-1.5 rounded-full bg-sunken p-1.5 text-[11.5px] font-semibold text-ink-2 sm:px-2 sm:py-0.5"
                          >
                            <Ban size={10} />
                            <span className="hidden sm:inline">Inactief</span>
                          </span>
                        )}
                      </td>
                      <td className="px-2 sm:px-5 py-2.5 sm:py-3.5">
                        {user.is_admin ? (
                          <span
                            title="Admin"
                            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface p-1.5 text-[11.5px] font-semibold text-ink sm:px-2 sm:py-0.5"
                          >
                            <Shield size={10} />
                            <span className="hidden sm:inline">Admin</span>
                          </span>
                        ) : (
                          <span
                            title="Gebruiker"
                            className="inline-flex items-center gap-1.5 rounded-full bg-sunken p-1.5 text-[11.5px] font-semibold text-ink-2 sm:px-2 sm:py-0.5"
                          >
                            <ShieldOff size={10} />
                            <span className="hidden sm:inline">Gebruiker</span>
                          </span>
                        )}
                      </td>
                      <td className="px-2 sm:px-5 py-2.5 sm:py-3.5">
                        <div className="flex items-center justify-end gap-1 sm:gap-1.5">
                          {/* Deactivate confirmation inline */}
                          {confirmDeactivateId === user.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-ink-3">Deactiveren?</span>
                              <button
                                onClick={() => handleDeactivate(user)}
                                disabled={updateMutation.isPending}
                                className="rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25 disabled:opacity-50 transition-colors"
                              >
                                {updateMutation.isPending ? "..." : "Ja"}
                              </button>
                              <button
                                onClick={() => setConfirmDeactivateId(null)}
                                className="rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-sunken text-ink-2 hover:text-ink transition-colors"
                              >
                                Nee
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() =>
                                isActive
                                  ? setConfirmDeactivateId(user.id!)
                                  : handleActivate(user)
                              }
                              disabled={updateMutation.isPending}
                              title={isActive ? "Deactiveren" : "Activeren"}
                              className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-40 ${
                                isActive
                                  ? "text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-500/15"
                                  : "text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-500/15"
                              }`}
                            >
                              {isActive ? <Ban size={14} /> : <CheckCircle size={14} />}
                            </button>
                          )}

                          <DeleteConfirmActions
                            id={user.id!}
                            confirmId={confirmDeleteId}
                            isPending={deleteMutation.isPending}
                            onEdit={() => setEditing(user)}
                            onRequestDelete={() => {
                              setConfirmDeactivateId(null);
                              setConfirmDeleteId(user.id!);
                            }}
                            onConfirmDelete={() => handleDelete(user.id!, user.name)}
                            onCancelDelete={() => setConfirmDeleteId(null)}
                          />
                        </div>
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

      <UserCreateDrawer open={creating} onClose={() => setCreating(false)} />

      <UserEditDrawer
        key={editing?.id ?? "none"}
        user={editing}
        onClose={() => setEditing(null)}
      />

      <AdminBulkBar
        count={selectedIds.size}
        isPending={bulkIsPending}
        onDelete={handleBulkDelete}
        onClear={clearSelection}
        extraActions={
          <button
            onClick={handleBulkDeactivate}
            disabled={bulkIsPending}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-40 dark:text-amber-300 dark:hover:bg-amber-500/15"
          >
            <Ban size={14} />
            Deactiveer
          </button>
        }
      />
    </div>
  );
}
