import { useState } from "react";
import { Plus, ShieldCheck, MessageSquare, Mail, Trash2 } from "lucide-react";
import { useAdminWhitelist, useCreateWhitelistEntry, useDeleteWhitelistEntry } from "../../hooks/useWhitelist";
import { toast } from "../../store/toast.store";
import { F } from "./styles";
import { AdminPageHeader } from "./components/AdminPageHeader";
import { AdminTableSkeleton } from "./components/AdminTableSkeleton";

export function AdminWhitelistPage() {
  const { data: entries = [], isLoading } = useAdminWhitelist();
  const createMutation = useCreateWhitelistEntry();
  const deleteMutation = useDeleteWhitelistEntry();

  const [discordId, setDiscordId] = useState("");
  const [email, setEmail] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmedDiscordId = discordId.trim();
    const trimmedEmail = email.trim();
    if (!trimmedDiscordId && !trimmedEmail) return;
    try {
      await createMutation.mutateAsync({
        discord_id: trimmedDiscordId || undefined,
        email: trimmedEmail || undefined,
      });
      setDiscordId("");
      setEmail("");
      toast("success", "Toegevoegd aan de whitelist.");
    } catch {
      toast("error", "Kon niet toevoegen — staat deze persoon er al op?");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMutation.mutateAsync(id);
      setConfirmDeleteId(null);
      toast("success", "Van de whitelist verwijderd.");
    } catch {
      toast("error", "Kon niet verwijderen.");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <AdminPageHeader
        title="Whitelist"
        subtitle={`${entries.length} personen mogen inloggen`}
      />

      <p className="text-sm text-ink-3">
        Alleen wie hier op staat kan bij de eerste keer inloggen een profiel aanmaken —
        op Discord ID voor wie via Discord inlogt, op e-mailadres voor wie via Google inlogt.
        Iemand die al een profiel heeft blijft gewoon toegang houden als deze hier
        (per ongeluk) niet meer op staat.
      </p>

      {/* Create form */}
      <form onSubmit={handleCreate} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={discordId}
          onChange={(e) => setDiscordId(e.target.value)}
          className={`${F} flex-1`}
          placeholder="Discord ID…"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`${F} flex-1`}
          placeholder="of e-mailadres…"
        />
        <button
          type="submit"
          disabled={(!discordId.trim() && !email.trim()) || createMutation.isPending}
          className="btn-primary shrink-0 px-4 py-2.5 text-sm disabled:opacity-50"
        >
          <Plus size={15} />
          Toevoegen
        </button>
      </form>

      {/* Entries table */}
      <div className="card-surface overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b-1.5 border-line">
              <th className="px-2.5 sm:px-5 py-2.5 sm:py-3 text-left whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[0.09em] text-ink-3">
                Identificatie
              </th>
              <th className="px-2 sm:px-5 py-2.5 sm:py-3 text-right whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[0.09em] text-ink-3">
                Acties
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading ? (
              <AdminTableSkeleton cols={2} />
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-5 py-10 text-center text-sm text-ink-3">
                  Nog niemand op de whitelist.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-sunken transition-colors">
                  <td className="px-2.5 sm:px-5 py-2.5 sm:py-3.5">
                    <div className="flex items-center gap-2 sm:gap-2.5">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink sm:h-7 sm:w-7">
                        {entry.discord_id
                          ? <MessageSquare size={13} />
                          : <Mail size={13} />}
                      </div>
                      <span className="truncate font-mono text-[13px] font-medium text-ink">
                        {entry.discord_id || entry.email}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 sm:px-5 py-2.5 sm:py-3.5">
                    {confirmDeleteId === entry.id ? (
                      <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                        <span className="hidden sm:inline text-xs text-ink-3">Verwijderen?</span>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          disabled={deleteMutation.isPending}
                          className="rounded-lg px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs font-semibold bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25 disabled:opacity-50 transition-colors"
                        >
                          {deleteMutation.isPending ? "..." : "Ja"}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-lg px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs font-semibold bg-sunken text-ink-2 hover:text-ink transition-colors"
                        >
                          Nee
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => setConfirmDeleteId(entry.id)}
                          className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg text-ink-3 hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-500/15 dark:hover:text-rose-300 transition-colors"
                          title="Verwijderen"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {entries.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-ink-3">
          <ShieldCheck size={12} />
          Deze lijst is alleen zichtbaar voor admins.
        </p>
      )}
    </div>
  );
}
