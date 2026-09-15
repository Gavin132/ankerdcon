import { useState } from "react";
import { LogIn, ShieldAlert, UserCog } from "lucide-react";
import { useAdminUsers, useAdminImpersonateUser } from "../../hooks/useAdmin";
import { useCurrentUser } from "../../hooks/useUsers";
import { useAuthStore } from "../../store/auth.store";
import { UserAvatar } from "../../components/common/UserAvatar";
import { AdminPageHeader } from "./components/AdminPageHeader";
import { AdminSearch } from "./components/AdminSearch";
import { toast } from "../../store/toast.store";

export function AdminImpersonatePage() {
  const { data: users = [], isLoading } = useAdminUsers();
  const { data: me } = useCurrentUser();
  const impersonateMutation = useAdminImpersonateUser();
  const startImpersonation = useAuthStore((s) => s.startImpersonation);
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const filtered = users
    .filter((u) => u.name !== me?.name)
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
    } catch {
      toast("error", "Inloggen als deze gebruiker is mislukt.");
      setPendingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <AdminPageHeader
        title="Inloggen als gebruiker"
        subtitle="Bekijk en gebruik de app als een andere gebruiker — handig voor gasten zonder eigen account"
      />

      <div className="flex items-start gap-2.5 rounded-xl border-1.5 border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
        <ShieldAlert size={15} className="shrink-0 mt-0.5" />
        <p>
          Alles wat je doet terwijl je bent ingelogd als iemand anders — RSVP&apos;s, ritten, betalingen — gebeurt écht
          en op hun naam. Gebruik de knop &ldquo;Terug naar mijn account&rdquo; in de balk bovenaan om te stoppen.
        </p>
      </div>

      <AdminSearch value={search} onChange={setSearch} placeholder="Zoek op naam..." />

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-sunken animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="card-surface px-4 py-8 text-center text-sm text-ink-3">
          Geen gebruikers gevonden.
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((user) => (
          <div
            key={user.id}
            className="card-surface flex items-center gap-3 px-4 py-3"
          >
            <UserAvatar name={user.name} className="h-9 w-9 text-xs shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-ink truncate">{user.name}</span>
                {!user.discord_id && (
                  <span className="rounded-md border border-line px-1.5 font-mono text-[10.5px] uppercase tracking-[0.05em] text-ink-2">
                    Gast
                  </span>
                )}
                {user.is_admin && (
                  <span className="rounded-md border border-line px-1.5 font-mono text-[10.5px] uppercase tracking-[0.05em] text-ink-2">
                    Admin
                  </span>
                )}
                {user.is_active === false && (
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11.5px] font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                    Gedeactiveerd
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              disabled={pendingId === user.id || user.is_active === false}
              onClick={() => handleImpersonate(user.id!, user.name)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border-1.5 border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-ink-3 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pendingId === user.id ? (
                <>
                  <UserCog size={13} className="animate-pulse" />
                  Bezig…
                </>
              ) : (
                <>
                  <LogIn size={13} />
                  Log in als
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
