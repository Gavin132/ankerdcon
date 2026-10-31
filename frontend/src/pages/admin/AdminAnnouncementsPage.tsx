import { useState, useRef } from "react";
import { Plus, Megaphone, Info, AlertTriangle, X, MessageSquare, Eye } from "lucide-react";
import {
  useAdminAnnouncements,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
} from "../../hooks/useAnnouncements";
import { AdminDrawer } from "./AdminDrawer";
import { AdminPage } from "./components/AdminPage";
import { AdminPageHeader } from "./components/AdminPageHeader";
import { AdminTableSkeleton } from "./components/AdminTableSkeleton";
import { DrawerFooter } from "./components/DrawerFooter";
import { ToggleRow } from "../../components/common/ToggleRow";
import { Switch } from "../../components/common/Switch";
import { DeleteConfirmActions } from "./components/DeleteConfirmActions";
import { DiscardChangesConfirm } from "./components/DiscardChangesConfirm";
import { useConfirmDiscard } from "../../hooks/useConfirmDiscard";
import { F, FS, L, TH, TD, TR, PILL_NEUTRAL, PILL_WARN, PILL_BAD } from "./styles";
import { toast } from "../../store/toast.store";
import type { Announcement, AnnouncementSeverity } from "../../types";
import { EmptyState } from "../../components/common/EmptyState";

const SEVERITY_LABEL: Record<AnnouncementSeverity, string> = {
  info: "Info",
  warning: "Waarschuwing",
  urgent: "Urgent",
};

const SEVERITY_PILL: Record<AnnouncementSeverity, string> = {
  info: PILL_NEUTRAL,
  warning: PILL_WARN,
  urgent: PILL_BAD,
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
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
      toast("error", "Kon de aankondiging niet opslaan. Probeer het opnieuw.");
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
      subtitle="Bovenaan elke pagina in de app"
      footer={
        <DrawerFooter
          onCancel={requestClose}
          formId="announcement-form"
          isPending={isSaving}
          isEdit={isEdit}
          submitLabel={isEdit ? undefined : "Plaatsen"}
          disabled={!isValid}
        />
      }
    >
      <form id="announcement-form" onSubmit={handleSave} className="space-y-4">
        <div>
          <label className={L}>Bericht *</label>
          <textarea
            className={F}
            rows={3}
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            placeholder="Bijvoorbeeld: de parkeerplaats bij de locatie is vanaf 10:00 open."
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
        <ToggleRow
          icon={<X size={16} />}
          label="Gebruikers kunnen dit sluiten"
          checked={form.dismissible}
          onChange={() => setForm((f) => ({ ...f, dismissible: !f.dismissible }))}
        />
        <ToggleRow
          icon={<MessageSquare size={16} />}
          label="Ook naar het Discord-kanaal sturen"
          checked={form.notify_discord}
          onChange={() => setForm((f) => ({ ...f, notify_discord: !f.notify_discord }))}
        />
        {isEdit && (
          <ToggleRow
            icon={<Eye size={16} />}
            label="Actief"
            hint="Zichtbaar voor iedereen."
            checked={form.active}
            onChange={() => setForm((f) => ({ ...f, active: !f.active }))}
          />
        )}
      </form>
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
      toast("error", "Kon de aankondiging niet verwijderen. Probeer het opnieuw.");
    }
  }

  function toggleActive(a: Announcement) {
    updateAnnouncement.mutate(
      { id: a.id, active: !a.active },
      {
        onError: () => toast("error", "Kon de status niet wijzigen. Probeer het opnieuw."),
      },
    );
  }

  return (
    <AdminPage>
      <AdminPageHeader
        title="Aankondigingen"
        subtitle={`${announcements.length} ${announcements.length === 1 ? "aankondiging" : "aankondigingen"}`}
        action={
          <button
            onClick={() => setDrawer("new")}
            className="btn-primary gap-2 px-4"
          >
            <Plus size={16} />
            Nieuwe aankondiging
          </button>
        }
      />

      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="stack-table w-full">
            <thead>
              <tr>
                <th className={TH}>Bericht</th>
                <th className={`${TH} hidden sm:table-cell`}>Type</th>
                <th className={TH}>Actief</th>
                <th className={`${TH} hidden sm:table-cell`}>Geplaatst door</th>
                <th className={`${TH} text-right`}>Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading ? (
                <AdminTableSkeleton cols={5} />
              ) : announcements.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState compact icon={<Megaphone size={22} />} title="Nog geen aankondigingen geplaatst" />
                  </td>
                </tr>
              ) : (
                announcements.map((a) => {
                  const Icon = SEVERITY_ICON[a.severity];
                  const severity = (
                    <span className={SEVERITY_PILL[a.severity]}>
                      <Icon size={14} />
                      {SEVERITY_LABEL[a.severity]}
                    </span>
                  );
                  return (
                    <tr key={a.id} className={`${TR} ${a.active ? "" : "opacity-60"}`}>
                      <td className={`cell-main ${TD}`}>
                        <p className="line-clamp-2 max-w-md text-sm text-ink">{a.message}</p>
                        <div className="mt-1.5 sm:hidden">{severity}</div>
                      </td>
                      <td className={`hidden sm:table-cell ${TD}`}>{severity}</td>
                      <td className={TD}>
                        <Switch checked={a.active} onChange={() => toggleActive(a)} label={a.active ? "Actief, tik om uit te zetten" : "Uit, tik om aan te zetten"} />
                      </td>
                      <td className={`hidden sm:table-cell ${TD}`}>
                        <p className="text-sm text-ink-3">{a.created_by ?? "—"}</p>
                      </td>
                      <td className={`cell-actions ${TD}`}>
                        <DeleteConfirmActions
                          id={a.id}
                          confirmId={confirmDeleteId}
                          isPending={deleteAnnouncement.isPending}
                          onEdit={() => setDrawer(a)}
                          onRequestDelete={() => setConfirmDeleteId(a.id)}
                          onConfirmDelete={() => handleDelete(a.id)}
                          onCancelDelete={() => setConfirmDeleteId(null)}
                          editLabel="Aankondiging bewerken"
                          deleteLabel="Aankondiging verwijderen"
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
    </AdminPage>
  );
}
