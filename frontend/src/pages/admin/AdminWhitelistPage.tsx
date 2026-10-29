import { useState } from "react";
import { Plus, ShieldCheck, MessageSquare, Mail, Trash2, Eye } from "lucide-react";
import { useAdminWhitelist, useCreateWhitelistEntry, useDeleteWhitelistEntry } from "../../hooks/useWhitelist";
import { toast } from "../../store/toast.store";
import { F, L, TH, TD, TR, PILL_NEUTRAL } from "./styles";
import { AdminPage } from "./components/AdminPage";
import { AdminPageHeader } from "./components/AdminPageHeader";
import { ToggleRow } from "./components/ToggleRow";
import { ConfirmInline } from "./components/ConfirmInline";
import { AdminTableSkeleton } from "./components/AdminTableSkeleton";

export function AdminWhitelistPage() {
  const { data: entries = [], isLoading } = useAdminWhitelist();
  const createMutation = useCreateWhitelistEntry();
  const deleteMutation = useDeleteWhitelistEntry();

  const [discordId, setDiscordId] = useState("");
  const [email, setEmail] = useState("");
  const [viewer, setViewer] = useState(false);
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
        // Only sent when ticked: a database without the column yet must still be able to add anyone.
        ...(viewer ? { viewer: true } : {}),
      });
      setDiscordId("");
      setEmail("");
      setViewer(false);
      toast("success", "Toegevoegd aan de toegangslijst.");
    } catch {
      toast("error", "Kon niet toevoegen. Staat deze persoon er al op? Controleer het Discord ID of e-mailadres en probeer het opnieuw.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMutation.mutateAsync(id);
      setConfirmDeleteId(null);
      toast("success", "Van de toegangslijst verwijderd.");
    } catch {
      toast("error", "Kon niet verwijderen. Probeer het opnieuw.");
    }
  }

  return (
    <AdminPage>
      <AdminPageHeader
        title="Toegangslijst"
        subtitle={`${entries.length} ${entries.length === 1 ? "persoon mag" : "personen mogen"} inloggen`}
      />

      <p className="max-w-3xl text-sm text-ink-2">
        Wie hier staat, kan bij de eerste keer inloggen een profiel aanmaken. Bestaande profielen
        houden hun toegang.
      </p>

      {/* Create form */}
      <form onSubmit={handleCreate} className="card-surface space-y-3 p-4">
        <p className="section-label">Toevoegen</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="whitelist-discord" className={L}>Discord ID</label>
            <input
              id="whitelist-discord"
              value={discordId}
              onChange={(e) => setDiscordId(e.target.value)}
              className={`${F} font-mono`}
              placeholder="123456789012345678"
              inputMode="numeric"
            />
            <p className="mt-1.5 text-xs text-ink-3">Voor wie via Discord inlogt.</p>
          </div>
          <div>
            <label htmlFor="whitelist-email" className={L}>E-mailadres</label>
            <input
              id="whitelist-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={F}
              placeholder="naam@voorbeeld.nl"
            />
            <p className="mt-1.5 text-xs text-ink-3">Voor wie via Google inlogt.</p>
          </div>
        </div>
        <ToggleRow
          icon={<Eye size={16} />}
          label="Alleen kijken"
          hint="Kan alles bekijken, maar niets aanpassen of zich ergens voor aanmelden."
          checked={viewer}
          onChange={() => setViewer((v) => !v)}
        />
        <button
          type="submit"
          disabled={(!discordId.trim() && !email.trim()) || createMutation.isPending}
          className="btn-primary min-h-[44px] w-full px-4 py-2.5 text-sm sm:w-auto"
        >
          <Plus size={16} />
          Toevoegen
        </button>
      </form>

      {/* Entries table */}
      <div className="card-surface overflow-hidden">
        <table className="stack-table w-full">
          <thead>
            <tr>
              <th className={TH}>Identificatie</th>
              <th className={`${TH} text-right`}>Acties</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading ? (
              <AdminTableSkeleton cols={2} />
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-5 py-10 text-center text-sm text-ink-3">
                  Nog niemand op de toegangslijst.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className={TR}>
                  <td className={`cell-main ${TD}`}>
                    <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
                        {entry.discord_id ? <MessageSquare size={14} /> : <Mail size={14} />}
                      </div>
                      <span className="min-w-0 truncate font-mono text-[13px] font-medium text-ink">
                        {entry.discord_id || entry.email}
                      </span>
                      {entry.viewer && (
                        <span className={`${PILL_NEUTRAL} shrink-0`}>
                          <Eye size={14} />
                          Kijker
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={`cell-actions ${TD}`}>
                    {confirmDeleteId === entry.id ? (
                      <ConfirmInline
                        isPending={deleteMutation.isPending}
                        onConfirm={() => handleDelete(entry.id)}
                        onCancel={() => setConfirmDeleteId(null)}
                      />
                    ) : (
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => setConfirmDeleteId(entry.id)}
                          className="icon-btn text-ink-3 hover:!bg-bad-soft hover:!text-bad"
                          title="Verwijderen"
                          aria-label={`${entry.discord_id || entry.email} van de toegangslijst verwijderen`}
                        >
                          <Trash2 size={16} />
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
    </AdminPage>
  );
}
