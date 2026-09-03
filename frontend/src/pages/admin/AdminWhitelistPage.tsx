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
    <div className="p-5 lg:p-8 max-w-4xl mx-auto space-y-5">
      <AdminPageHeader
        title="Whitelist"
        subtitle={`${entries.length} personen mogen inloggen`}
      />

      <p className="text-sm text-slate-500 dark:text-slate-400">
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
          className="flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-40 transition-colors shadow-sm shrink-0"
        >
          <Plus size={15} />
          Toevoegen
        </button>
      </form>

      {/* Entries table */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.06] bg-white dark:bg-slate-800/60 overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06] bg-slate-50/80 dark:bg-slate-900/40">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                Identificatie
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                Acties
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {isLoading ? (
              <AdminTableSkeleton cols={2} />
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-5 py-10 text-center text-sm text-slate-400">
                  Nog niemand op de whitelist.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-500/10">
                        {entry.discord_id
                          ? <MessageSquare size={13} className="text-sky-500" />
                          : <Mail size={13} className="text-sky-500" />}
                      </div>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {entry.discord_id || entry.email}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {confirmDeleteId === entry.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-slate-500">Verwijderen?</span>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          disabled={deleteMutation.isPending}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 disabled:opacity-50 transition-colors"
                        >
                          {deleteMutation.isPending ? "..." : "Ja"}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white/[0.06] text-slate-400 hover:bg-white/[0.1] transition-colors"
                        >
                          Nee
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => setConfirmDeleteId(entry.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
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
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck size={12} />
          Deze lijst is alleen zichtbaar voor admins.
        </p>
      )}
    </div>
  );
}
