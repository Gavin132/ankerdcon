import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Shield, ShieldOff, Plus, X } from "lucide-react";
import {
  useAdminUsers,
  useAdminUpdateUser,
  useAdminDeleteUser,
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

const PAGE_SIZE = 15;

const editSchema = z.object({
  hotel_room: z.string().optional(),
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

// ── Edit drawer ───────────────────────────────────────────────────────────────

function UserEditDrawer({
  user,
  onClose,
}: {
  user: User | null;
  onClose: () => void;
}) {
  const updateMutation = useAdminUpdateUser();
  const [aliases, setAliases] = useState<string[]>(user?.aliases ?? []);
  const [aliasInput, setAliasInput] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      hotel_room: user?.hotel_room ?? "",
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

  return (
    <AdminDrawer
      open={!!user}
      onClose={onClose}
      title={user?.name ?? ""}
      subtitle={
        user?.discord_username
          ? `@${user.discord_username}`
          : "Gebruiker bewerken"
      }
      footer={
        <DrawerFooter
          onCancel={onClose}
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
          <div className="flex items-center gap-3 pb-4 border-b border-white/[0.06]">
            <UserAvatar
              name={user.name}
              className="h-12 w-12 text-sm shrink-0"
            />
            <div>
              <p className="text-sm font-bold text-white">{user.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {user.discord_username ?? "Geen Discord"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={L}>Hotelkamer</label>
              <input
                {...register("hotel_room")}
                className={F}
                placeholder="101"
              />
            </div>
            <div>
              <label className={L}>Telefoonnummer</label>
              <input
                {...register("phone_number")}
                className={F}
                placeholder="+31 6..."
              />
            </div>
          </div>

          <div>
            <label className={L}>Voornaamwoorden</label>
            <input
              {...register("pronouns")}
              className={F}
              placeholder="hij/hem"
            />
            {errors.pronouns && (
              <p className="text-xs text-rose-400 mt-1">
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
              <p className="text-xs text-rose-400 mt-1">{errors.bio.message}</p>
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
              <p className="text-xs text-rose-400 mt-1">
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
                className="flex h-[42px] w-10 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white disabled:opacity-30 hover:bg-sky-700 transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
            {aliases.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {aliases.map((a) => (
                  <span
                    key={a}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] border border-white/10 px-2.5 py-1 text-xs font-semibold text-slate-300"
                  >
                    {a}
                    <button
                      type="button"
                      onClick={() => setAliases(aliases.filter((x) => x !== a))}
                      className="text-slate-500 hover:text-rose-400 transition-colors"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="mt-1.5 text-[11px] text-slate-500">
              Zoekopdrachten in aanmeldformulieren herkennen deze namen ook.
            </p>
          </div>

          {/* Admin toggle */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3">
            <div className="flex items-center gap-2">
              <Shield size={15} className="text-sky-500" />
              <span className="text-sm font-medium text-slate-300">
                Admin-rechten
              </span>
            </div>
            <button
              type="button"
              onClick={() => setValue("is_admin", !isAdmin)}
              className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
                isAdmin ? "bg-sky-500" : "bg-white/20"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  isAdmin ? "translate-x-4" : ""
                }`}
              />
            </button>
          </div>
        </form>
      )}
    </AdminDrawer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AdminUsersPage() {
  const { data: users = [], isLoading } = useAdminUsers();
  const deleteMutation = useAdminDeleteUser();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<User | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      (u.discord_username ?? "").toLowerCase().includes(q) ||
      u.aliases?.some((a) => a.toLowerCase().includes(q))
    );
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(0, totalPages - 1));
  const paginated = filtered.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE,
  );

  function handleSearch(v: string) {
    setSearch(v);
    setPage(0);
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

  return (
    <div className="p-5 lg:p-8 max-w-6xl mx-auto space-y-5">
      <AdminPageHeader
        title="Gebruikers"
        subtitle={`${users.length} accounts geregistreerd`}
      />

      <AdminSearch
        value={search}
        onChange={handleSearch}
        placeholder="Zoek op naam, Discord of alias..."
      />

      <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.06] bg-white dark:bg-slate-800/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06] bg-slate-50/80 dark:bg-slate-900/40">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Gebruiker
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Hotel
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Rol
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Acties
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {isLoading ? (
                <AdminTableSkeleton cols={4} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-10 text-center text-sm text-slate-400"
                  >
                    Geen gebruikers gevonden.
                  </td>
                </tr>
              ) : (
                paginated.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          name={user.name}
                          className="h-8 w-8 text-[10px] shrink-0"
                        />
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {user.name}
                          </p>
                          {user.discord_username && (
                            <p className="text-xs text-slate-400">
                              {user.discord_username}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        {user.hotel_room || (
                          <span className="text-slate-300 dark:text-slate-600">
                            —
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {user.is_admin ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 dark:bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:text-sky-400">
                          <Shield size={10} />
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          <ShieldOff size={10} />
                          Gebruiker
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <DeleteConfirmActions
                        id={user.id!}
                        confirmId={confirmDeleteId}
                        isPending={deleteMutation.isPending}
                        onEdit={() => setEditing(user)}
                        onRequestDelete={() => setConfirmDeleteId(user.id!)}
                        onConfirmDelete={() =>
                          handleDelete(user.id!, user.name)
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

      <UserEditDrawer
        key={editing?.id ?? "none"}
        user={editing}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
