import { useState } from "react";
import { LogIn, ShieldAlert, UserCog, Users } from "lucide-react";
import { useAdminUsers, useAdminImpersonateUser } from "../../hooks/useAdmin";
import { ApiError } from "../../lib/api/client";
import { useCurrentUser } from "../../hooks/useUsers";
import { useAuthStore } from "../../store/auth.store";
import { UserAvatar } from "../../components/common/UserAvatar";
import { AdminPage } from "./components/AdminPage";
import { AdminPageHeader } from "./components/AdminPageHeader";
import { TAG, PILL_BAD } from "./styles";
import { AdminSearch } from "./components/AdminSearch";
import { toast } from "../../store/toast.store";
import { EmptyState } from "../../components/common/EmptyState";

export function AdminImpersonatePage() {
  const { data: users = [], isLoading } = useAdminUsers();
  const { data: me } = useCurrentUser();
  const impersonateMutation = useAdminImpersonateUser();
  const startImpersonation = useAuthStore((s) => s.startImpersonation);
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const filtered = users
    .filter((u) => u.name !== me?.name)
    // The backend refuses to sign in as another admin.
    .filter((u) => !u.is_admin)
    .filter((u) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return u.name.toLowerCase().includes(q) || (u.discord_username ?? "").toLowerCase().includes(q);
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  async function handleImpersonate(userId: string, name: string) {
    setPendingId(userId);
    try {
      const { access_token } = await impersonateMutation.mutateAsync(userId);
      startImpersonation(access_token, name);
      // startImpersonation hard-reloads the page — nothing after this runs.
    } catch (err) {
      const detail = err instanceof ApiError ? err.message : null;
      toast("error", detail || "Kon niet inloggen als deze gebruiker. Probeer het opnieuw.");
      setPendingId(null);
    }
  }

  return (
    <AdminPage width="narrow">
      <AdminPageHeader
        eyebrow="Testen"
        title="Inloggen als gebruiker"
        subtitle="Gebruik de app als iemand anders, handig voor gasten zonder eigen account"
      />

      <div className="notice-warn flex items-start gap-2.5 p-4 text-sm text-ink">
        <ShieldAlert size={16} className="mt-0.5 shrink-0 text-warn" />
        <p>
          Alles wat je doet terwijl je bent ingelogd als iemand anders (aanmeldingen, ritten, betalingen) gebeurt écht
          en op hun naam. Gebruik &ldquo;Terug naar mijn account&rdquo; in de balk bovenaan om te stoppen.
        </p>
      </div>

      <AdminSearch value={search} onChange={setSearch} placeholder="Zoek op naam…" />

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-sunken animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="card-surface">
          <EmptyState compact icon={<Users size={22} />} title="Geen gebruikers gevonden" />
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((user) => (
          <div
            key={user.id}
            className="card-surface flex items-center gap-3 px-4 py-3"
          >
            <UserAvatar name={user.name} className="h-9 w-9 text-xs shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="min-w-0 truncate text-sm font-semibold text-ink">{user.name}</span>
                {!user.discord_id && <span className={`${TAG} shrink-0`}>Gast</span>}
              </div>
              {user.is_active === false && <span className={`${PILL_BAD} mt-1`}>Gedeactiveerd</span>}
            </div>
            <button
              type="button"
              disabled={pendingId === user.id || user.is_active === false}
              onClick={() => handleImpersonate(user.id!, user.name)}
              className="btn-primary shrink-0 px-4"
            >
              {pendingId === user.id ? (
                <>
                  <UserCog size={16} className="animate-pulse" />
                  Bezig…
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Log in als
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </AdminPage>
  );
}
