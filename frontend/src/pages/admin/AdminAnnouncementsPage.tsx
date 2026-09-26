import { useState, useRef } from "react";
import { Plus, Megaphone, Info, AlertTriangle } from "lucide-react";
import {
  useAdminAnnouncements,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
} from "../../hooks/useAnnouncements";
import { AdminDrawer } from "./AdminDrawer";
import { AdminPageHeader } from "./components/AdminPageHeader";
import { AdminTableSkeleton } from "./components/AdminTableSkeleton";
import { DeleteConfirmActions } from "./components/DeleteConfirmActions";
import { DiscardChangesConfirm } from "./components/DiscardChangesConfirm";
import { useConfirmDiscard } from "../../hooks/useConfirmDiscard";
import { F, FS, L, SECTION, SECTION_TITLE } from "./styles";
import { toast } from "../../store/toast.store";
import type { Announcement, AnnouncementSeverity } from "../../types";

const SEVERITY_LABEL: Record<AnnouncementSeverity, string> = {
  info: "Info",
  warning: "Waarschuwing",
  urgent: "Urgent",
};

const SEVERITY_CHIP: Record<AnnouncementSeverity, string> = {
  info: "bg-sunken text-ink-2",
  warning: "bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300",
  urgent: "bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

const SEVERITY_ICON: Record<AnnouncementSeverity, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  urgent: Megaphone,
};

// ── Drawer (create / edit) ──────────────────────────────────────────────────────

interface FormState {
  message: string;
  severity: AnnouncementSeverity;
  dismissible: boolean;
  active: boolean;
  notify_discord: boolean;
}

const EMPTY: FormState = { message: "", severity: "info", dismissible: true, active: true, notify_discord: false };

function AnnouncementDrawer({
  announcement,
  onClose,
}: {
  announcement: Announcement | "new" | null;
  onClose: () => void;
}) {
  const isEdit = announcement !== null && announcement !== "new";
  const open = announcement !== null;

  const createAnnouncement = useCreateAnnouncement();
  const updateAnnouncement = useUpdateAnnouncement();

  const initialForm = useRef<FormState>(
    isEdit
      ? {
          message: announcement.message,
          severity: announcement.severity,
          dismissible: announcement.dismissible,
          active: announcement.active,
          notify_discord: announcement.notify_discord,
        }
      : EMPTY,
  );
  const [form, setForm] = useState<FormState>(initialForm.current);

  async function handleSave() {
    if (!form.message.trim()) return;
    try {
      if (isEdit) {
        await updateAnnouncement.mutateAsync({ id: announcement.id, ...form });
        toast("success", "Aankondiging bijgewerkt.");
      } else {
        await createAnnouncement.mutateAsync({
          message: form.message,
          severity: form.severity,
          dismissible: form.dismissible,
          notify_discord: form.notify_discord,
        });
        toast("success", "Aankondiging geplaatst.");
      }
      onClose();
    } catch {
      toast("error", "Kon aankondiging niet opslaan.");
    }
  }

  const isSaving = createAnnouncement.isPending || updateAnnouncement.isPending;
  const isValid = !!form.message.trim();
  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm.current);
  const { requestClose, confirming, confirmDiscard, cancelDiscard } = useConfirmDiscard(isDirty, onClose);

  return (
    <>
    <AdminDrawer
      open={open}
      onClose={requestClose}
      title={isEdit ? "Aankondiging bewerken" : "Nieuwe aankondiging"}
      subtitle="Zichtbaar boven de navigatiebalk op elke pagina"
      footer={
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={!isValid || isSaving}
            className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Opslaan..." : isEdit ? "Bijwerken" : "Plaatsen"}
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
        <p className={SECTION_TITLE}>Aankondiging</p>
        <div>
          <label className={L}>Bericht *</label>
          <textarea
            className={F}
            rows={3}
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            placeholder="bijv. De parkeerplaats bij de locatie is vanaf 10:00 open."
          />
        </div>
        <div>
          <label className={L}>Type</label>
          <select
            className={FS}
            value={form.severity}
            onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value as AnnouncementSeverity }))}
          >
            <option value="info">Info (blauw)</option>
            <option value="warning">Waarschuwing (amber)</option>
            <option value="urgent">Urgent (rood)</option>
          </select>
        </div>
        <label className="flex items-center gap-2.5 text-sm text-ink-2 cursor-pointer">
          <input
            type="checkbox"
            className="cb"
            checked={form.dismissible}
            onChange={(e) => setForm((f) => ({ ...f, dismissible: e.target.checked }))}
          />
          Gebruikers kunnen dit sluiten
        </label>
        <label className="flex items-center gap-2.5 text-sm text-ink-2 cursor-pointer">
          <input
            type="checkbox"
            className="cb"
            checked={form.notify_discord}
            onChange={(e) => setForm((f) => ({ ...f, notify_discord: e.target.checked }))}
          />
          Ook naar het Discord-kanaal sturen
        </label>
        {isEdit && (
          <label className="flex items-center gap-2.5 text-sm text-ink-2 cursor-pointer">
            <input
              type="checkbox"
              className="cb"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            />
            Actief (zichtbaar voor iedereen)
          </label>
        )}
      </div>
    </AdminDrawer>
    <DiscardChangesConfirm open={confirming} onCancel={cancelDiscard} onConfirm={confirmDiscard} />
    </>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function AdminAnnouncementsPage() {
  const { data: announcements = [], isLoading } = useAdminAnnouncements();
  const updateAnnouncement = useUpdateAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();

  const [drawer, setDrawer] = useState<Announcement | "new" | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    try {
      await deleteAnnouncement.mutateAsync(id);
      toast("success", "Aankondiging verwijderd.");
      setConfirmDeleteId(null);
    } catch {
      toast("error", "Kon aankondiging niet verwijderen.");
    }
  }

  function toggleActive(a: Announcement) {
    updateAnnouncement.mutate(
      { id: a.id, active: !a.active },
      {
        onError: () => toast("error", "Kon status niet wijzigen."),
      },
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <AdminPageHeader
        title="Aankondigingen"
        subtitle={`${announcements.length} aankondiging${announcements.length !== 1 ? "en" : ""}`}
        action={
          <button
            onClick={() => setDrawer("new")}
            className="btn-primary gap-2 px-4 py-2.5 text-sm"
          >
            <Plus size={16} />
            Nieuwe aankondiging
          </button>
        }
      />

      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-1.5 border-line">
                <th className="px-2 sm:px-5 py-2.5 sm:py-3 text-left whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[0.09em] text-ink-3">
                  Status
                </th>
                <th className="px-2.5 sm:px-5 py-2.5 sm:py-3 text-left whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[0.09em] text-ink-3">
                  Bericht
                </th>
                <th className="px-2 sm:px-5 py-2.5 sm:py-3 text-left whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[0.09em] text-ink-3">
                  Type
                </th>
                <th className="hidden sm:table-cell px-5 py-3 text-left whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[0.09em] text-ink-3">
                  Geplaatst door
                </th>
                <th className="px-2 sm:px-5 py-2.5 sm:py-3 text-right whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[0.09em] text-ink-3">
                  Acties
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading ? (
                <AdminTableSkeleton cols={5} />
              ) : announcements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-ink-3">
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-sunken text-ink-3"><Megaphone size={22} /></span>
                      <p className="text-sm">Nog geen aankondigingen geplaatst.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                announcements.map((a) => {
                  const Icon = SEVERITY_ICON[a.severity];
                  return (
                    <tr key={a.id} className="hover:bg-sunken transition-colors">
                      <td className="px-2 sm:px-5 py-2.5 sm:py-3.5">
                        <button
                          onClick={() => toggleActive(a)}
                          title={a.active ? "Actief" : "Inactief"}
                          className={`inline-flex items-center gap-1.5 rounded-full p-1.5 sm:px-2 sm:py-0.5 text-[11.5px] font-semibold transition-colors ${
                            a.active
                              ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-500/25"
                              : "bg-sunken text-ink-2 hover:text-ink"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${a.active ? "bg-emerald-500" : "bg-ink-3"}`} />
                          <span className="hidden sm:inline">{a.active ? "Actief" : "Inactief"}</span>
                        </button>
                      </td>
                      <td className="px-2.5 sm:px-5 py-2.5 sm:py-3.5">
                        <p className="text-sm text-ink max-w-[160px] sm:max-w-md truncate">
                          {a.message}
                        </p>
                      </td>
                      <td className="px-2 sm:px-5 py-2.5 sm:py-3.5">
                        <span
                          title={SEVERITY_LABEL[a.severity]}
                          className={`inline-flex items-center gap-1.5 rounded-full p-1.5 sm:px-2 sm:py-0.5 text-[11.5px] font-semibold ${SEVERITY_CHIP[a.severity]}`}
                        >
                          <Icon size={11} />
                          <span className="hidden sm:inline">{SEVERITY_LABEL[a.severity]}</span>
                        </span>
                      </td>
                      <td className="hidden sm:table-cell px-5 py-3.5">
                        <p className="text-sm text-ink-3">
                          {a.created_by ?? "—"}
                        </p>
                      </td>
                      <td className="px-2 sm:px-5 py-2.5 sm:py-3.5" onClick={(e) => e.stopPropagation()}>
                        <DeleteConfirmActions
                          id={a.id}
                          confirmId={confirmDeleteId}
                          isPending={deleteAnnouncement.isPending}
                          onEdit={() => setDrawer(a)}
                          onRequestDelete={() => setConfirmDeleteId(a.id)}
                          onConfirmDelete={() => handleDelete(a.id)}
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
      </div>

      <AnnouncementDrawer
        key={typeof drawer === "object" && drawer !== null ? drawer.id : (drawer ?? "none")}
        announcement={drawer}
        onClose={() => setDrawer(null)}
      />
    </div>
  );
}
