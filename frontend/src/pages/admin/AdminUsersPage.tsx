import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Shield, Plus, X, UserPlus, Ban, Copy, Check, Eye, Users, GitMerge, Hourglass } from "lucide-react";
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
import { F, L, TH, TD, TR, TR_SELECTED, PILL_NEUTRAL, CHIP_ON, CHIP_OFF } from "./styles";
import { AdminPage } from "./components/AdminPage";
import { AdminPageHeader } from "./components/AdminPageHeader";
import { AdminSearch } from "./components/AdminSearch";
import { AdminTableSkeleton } from "./components/AdminTableSkeleton";
import { AdminPagination } from "./components/AdminPagination";
import { DeleteConfirmActions } from "./components/DeleteConfirmActions";
import { DrawerFooter } from "./components/DrawerFooter";
import { DiscardChangesConfirm } from "./components/DiscardChangesConfirm";
import { AdminBulkBar } from "./components/AdminBulkBar";
import { RowCheckbox } from "./components/RowCheckbox";
import { ToggleRow } from "../../components/common/ToggleRow";
import { useTableSelection } from "../../hooks/useTableSelection";
import { useConfirmDiscard } from "../../hooks/useConfirmDiscard";
import { askConfirm } from "../../store/confirm.store";
import { EmptyState } from "../../components/common/EmptyState";
import { UserMergeSheet } from "./components/UserMergeSheet";

const PAGE_SIZE = 15;

// ── Create drawer ─────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(2, "Min 2 tekens").max(30, "Max 30 tekens"),
  discord_id: z.string().optional(),
  is_admin: z.boolean().optional(),
  is_viewer: z.boolean().optional(),
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
    defaultValues: { name: "", discord_id: "", is_admin: false, is_viewer: false },
  });
  const isAdmin = watch("is_admin");
  const isViewer = watch("is_viewer");
  const { requestClose, confirming, confirmDiscard, cancelDiscard } = useConfirmDiscard(isDirty, onClose);

  async function onSubmit(values: CreateForm) {
    try {
      await createMutation.mutateAsync({
        name: values.name,
        discord_id: values.discord_id || undefined,
        is_admin: values.is_admin,
        // Only sent when it is on: a database without the column yet must still be able to add anyone.
        ...(values.is_viewer ? { is_viewer: true } : {}),
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
      subtitle="Met of zonder eigen account"
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
            <p className="field-error">{errors.name.message}</p>
          )}
          <p className="mt-1.5 text-xs text-ink-3">
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
          <p className="mt-1.5 text-xs text-ink-3">
            Alleen nodig als deze persoon zelf met Discord gaat inloggen — voor een stabielere koppeling na naamwijzigingen. Laat dit leeg voor iemand zonder eigen account (bijv. iemand die niet mee wil doen aan de app); je kunt ze dan nog steeds overal aan toevoegen.
          </p>
        </div>

        <ToggleRow
          icon={<Shield size={16} />}
          label="Admin-rechten"
          checked={!!isAdmin}
          onChange={() => setValue("is_admin", !isAdmin, { shouldDirty: true })}
        />
        <ToggleRow
          icon={<Eye size={16} />}
          label="Alleen kijken"
          hint="Kan alles bekijken, maar niets aanpassen of zich ergens voor aanmelden."
          checked={!!isViewer}
          onChange={() => setValue("is_viewer", !isViewer, { shouldDirty: true })}
        />
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
  is_viewer: z.boolean().optional(),
  is_active: z.boolean().optional(),
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
      is_viewer: user?.is_viewer ?? false,
      is_active: user?.is_active !== false,
    },
  });
  const isAdmin = watch("is_admin");
  const isViewer = watch("is_viewer");
  const isActive = watch("is_active");

  function addAlias() {
    const trimmed = aliasInput.trim();
    if (trimmed && !aliases.includes(trimmed) && aliases.length < 10) {
      setAliases([...aliases, trimmed]);
      setAliasInput("");
    }
  }

  async function onSubmit(values: EditForm) {
    // Deactivating takes the member off every event and sends a Discord message, so it asks first.
    if (user?.is_active !== false && values.is_active === false) {
      const ok = await askConfirm({
        title: `${user!.name} deactiveren?`,
        message: "Deze persoon kan niet meer inloggen, gaat van alle evenementen af en krijgt een bericht op Discord.",
        confirmLabel: "Deactiveren",
        cancelLabel: "Annuleren",
        destructive: true,
      });
      if (!ok) return;
    }
    try {
      // is_viewer only when it was changed: a database without the column yet must still save everything else.
      const { is_viewer, is_active, ...rest } = values;
      await updateMutation.mutateAsync({
        id: user!.id!,
        ...rest,
        aliases,
        ...((is_viewer ?? false) !== (user?.is_viewer ?? false) ? { is_viewer } : {}),
        ...((is_active ?? true) !== (user?.is_active !== false) ? { is_active } : {}),
      });
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
              placeholder="+31 6…"
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
              <p className="field-error">
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
              placeholder="Over mij…"
            />
            {errors.bio && (
              <p className="field-error">{errors.bio.message}</p>
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
              <p className="field-error">
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
                aria-label="Alias toevoegen"
                className="btn-primary h-11 w-11 shrink-0"
              >
                <Plus size={16} />
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
                      aria-label={`Alias ${a} verwijderen`}
                      className="hit-area -mr-1 p-1 text-ink-3 hover:text-bad transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="mt-1.5 text-xs text-ink-3">
              Zoekopdrachten in aanmeldformulieren herkennen deze namen ook.
            </p>
          </div>

          <ToggleRow
            icon={<Shield size={16} />}
            label="Admin-rechten"
            checked={!!isAdmin}
            onChange={() => setValue("is_admin", !isAdmin, { shouldDirty: true })}
          />
          <ToggleRow
            icon={<Eye size={16} />}
            label="Alleen kijken"
            hint="Kan alles bekijken, maar niets aanpassen of zich ergens voor aanmelden."
            checked={!!isViewer}
            onChange={() => setValue("is_viewer", !isViewer, { shouldDirty: true })}
          />
          <ToggleRow
            icon={<Ban size={16} />}
            label="Account actief"
            hint="Uitzetten blokkeert inloggen en haalt de persoon van alle evenementen af."
            checked={isActive !== false}
            onChange={() => setValue("is_active", isActive === false, { shouldDirty: true })}
          />
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
  const deleteMutation = useAdminDeleteUser();
  const bulkDeleteMutation = useAdminBulkDeleteUsers();
  const bulkDeactivateMutation = useAdminBulkDeactivateUsers();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<User | null>(null);
  const [merging, setMerging] = useState<User | null>(null);
  const [onlyPlaceholders, setOnlyPlaceholders] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const placeholderCount = users.filter((u) => u.is_placeholder).length;
  // Switched on and the last placeholder merged away: back to everyone, not to an empty list with no way out.
  const placeholdersOnly = onlyPlaceholders && placeholderCount > 0;

  const filtered = users.filter((u) => {
    if (placeholdersOnly && !u.is_placeholder) return false;
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
    const ok = await askConfirm({
      title: `${ids.length} ${ids.length === 1 ? "gebruiker" : "gebruikers"} deactiveren?`,
      message: "Zij kunnen niet meer inloggen, gaan van alle evenementen af en krijgen een bericht op Discord.",
      confirmLabel: "Deactiveren",
      cancelLabel: "Annuleren",
      destructive: true,
    });
    if (!ok) return;
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
    <AdminPage>
      <AdminPageHeader
        title="Gebruikers"
        subtitle={`${activeCount} actief · ${users.length} totaal`}
        action={
          <button
            onClick={() => setCreating(true)}
            className="btn-primary min-h-[44px] px-4 py-2 text-sm"
          >
            <UserPlus size={16} />
            Nieuwe gebruiker
          </button>
        }
      />

      <AdminSearch
        value={search}
        onChange={handleSearch}
        placeholder="Zoek op naam, Discord of alias…"
      />

      {placeholderCount > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter">
          <button
            type="button"
            className={placeholdersOnly ? CHIP_OFF : CHIP_ON}
            aria-pressed={!placeholdersOnly}
            onClick={() => { setOnlyPlaceholders(false); setPage(0); }}
          >
            Iedereen · {users.length}
          </button>
          <button
            type="button"
            className={placeholdersOnly ? CHIP_ON : CHIP_OFF}
            aria-pressed={placeholdersOnly}
            onClick={() => { setOnlyPlaceholders(true); setPage(0); }}
          >
            Placeholders · {placeholderCount}
          </button>
        </div>
      )}

      <AdminBulkBar
        itemsLabel="gebruikers"
        count={selectedIds.size}
        isPending={bulkIsPending}
        onDelete={handleBulkDelete}
        onClear={clearSelection}
        extraActions={
          <button
            onClick={handleBulkDeactivate}
            disabled={bulkIsPending}
            className="btn-secondary px-3 text-sm"
          >
            <Ban size={16} />
            Deactiveren
          </button>
        }
      />

      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="stack-table w-full">
            <thead>
              <tr className="text-left">
                <th className={`${TH} w-10 !pr-2`}>
                  <RowCheckbox checked={allSelected} indeterminate={indeterminate} onChange={selectAll} label="Alles selecteren" />
                </th>
                <th className={TH}>Gebruiker</th>
                <th className={`${TH} hidden sm:table-cell`}>Discord ID</th>
                <th className={TH}>Status</th>
                <th className={`${TH} text-right`}>Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading ? (
                <AdminTableSkeleton cols={5} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState compact icon={<Users size={22} />} title="Geen gebruikers gevonden" />
                  </td>
                </tr>
              ) : (
                paginated.map((user) => {
                  const isActive = user.is_active !== false;
                  const isSelected = selectedIds.has(user.id!);
                  return (
                    <tr key={user.id} className={`${isSelected ? TR_SELECTED : TR} ${!isActive ? "opacity-60" : ""}`}>
                      <td
                        className={`${TD} w-10 !pr-2`}
                        onClick={(e) => { e.stopPropagation(); toggleSelect(user.id!); }}
                      >
                        <RowCheckbox checked={isSelected} onChange={() => toggleSelect(user.id!)} label={`Selecteer ${user.name}`} />
                      </td>
                      <td className={`cell-main ${TD}`}>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <UserAvatar
                            name={user.name}
                            className="h-7 w-7 sm:h-8 sm:w-8 text-[9px] sm:text-[10px] shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                            {user.discord_username && (
                              <p className="truncate text-xs text-ink-3">@{user.discord_username}</p>
                            )}
                            {/* Under the name, not in the status column: a wide pill there squeezes the name to nothing on a phone. */}
                            {user.is_placeholder && (
                              <span className={`${PILL_NEUTRAL} mt-1`} title="Nog niemand heeft hiermee ingelogd">
                                <Hourglass size={14} />
                                Placeholder
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className={`hidden sm:table-cell ${TD}`}>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs text-ink-3">{user.discord_id ?? "—"}</span>
                          {user.discord_id && (
                            <button
                              onClick={() => handleCopyDiscordId(user.discord_id!, user.id!)}
                              className="icon-btn text-ink-3"
                              title="Discord ID kopiëren"
                              aria-label="Discord ID kopiëren"
                            >
                              {copiedId === user.id ? <Check size={14} className="text-ok" /> : <Copy size={14} />}
                            </button>
                          )}
                        </div>
                      </td>
                      {/* Only what is not the normal case: a plain active member shows nothing here. */}
                      <td className={TD}>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {!isActive && (
                            <span className={PILL_NEUTRAL}>
                              <Ban size={14} />
                              Inactief
                            </span>
                          )}
                          {user.is_admin && (
                            <span className="pill border border-line bg-surface text-ink">
                              <Shield size={14} />
                              Admin
                            </span>
                          )}
                          {user.is_viewer && !user.is_admin && (
                            <span className="pill border border-line bg-surface text-ink-2">
                              <Eye size={14} />
                              Kijker
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`cell-actions ${TD}`}>
                        <DeleteConfirmActions
                          id={user.id!}
                          confirmId={confirmDeleteId}
                          isPending={deleteMutation.isPending}
                          onEdit={() => setEditing(user)}
                          onRequestDelete={() => setConfirmDeleteId(user.id!)}
                          onConfirmDelete={() => handleDelete(user.id!, user.name)}
                          onCancelDelete={() => setConfirmDeleteId(null)}
                          editLabel={`${user.name} bewerken`}
                          deleteLabel={`${user.name} verwijderen`}
                          before={
                            user.is_placeholder ? (
                              <button
                                onClick={() => setMerging(user)}
                                className="icon-btn text-ink-3"
                                title="Voeg samen met…"
                                aria-label={`${user.name} samenvoegen met een lid`}
                              >
                                <GitMerge size={16} />
                              </button>
                            ) : undefined
                          }
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

      <UserCreateDrawer open={creating} onClose={() => setCreating(false)} />

      <UserMergeSheet key={merging?.id ?? "none-merge"} source={merging} users={users} onClose={() => setMerging(null)} />

      <UserEditDrawer
        key={editing?.id ?? "none"}
        user={editing}
        onClose={() => setEditing(null)}
      />
    </AdminPage>
  );
}
