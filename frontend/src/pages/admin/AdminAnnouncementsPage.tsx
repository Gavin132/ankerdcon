import { useState } from "react";
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
import { F, FS, L, SECTION, SECTION_TITLE } from "./styles";
import { toast } from "../../store/toast.store";
import type { Announcement, AnnouncementSeverity } from "../../types";

const SEVERITY_LABEL: Record<AnnouncementSeverity, string> = {
  info: "Info",
  warning: "Waarschuwing",
  urgent: "Urgent",
};

const SEVERITY_CHIP: Record<AnnouncementSeverity, string> = {
  info: "bg-sky-100 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400",
  warning: "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
  urgent: "bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400",
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

  const [form, setForm] = useState<FormState>(
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

  return (
    <AdminDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Aankondiging bewerken" : "Nieuwe aankondiging"}
      subtitle="Zichtbaar boven de navigatiebalk op elke pagina"
      footer={
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={!isValid || isSaving}
            className="flex-1 rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? "Opslaan..." : isEdit ? "Bijwerken" : "Plaatsen"}
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/[0.05] transition-colors"
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
        <label className="flex items-center gap-2.5 text-sm text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            className="cb"
            checked={form.dismissible}
            onChange={(e) => setForm((f) => ({ ...f, dismissible: e.target.checked }))}
          />
          Gebruikers kunnen dit sluiten
        </label>
        <label className="flex items-center gap-2.5 text-sm text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            className="cb"
            checked={form.notify_discord}
            onChange={(e) => setForm((f) => ({ ...f, notify_discord: e.target.checked }))}
          />
          Ook naar het Discord-kanaal sturen
        </label>
        {isEdit && (
          <label className="flex items-center gap-2.5 text-sm text-slate-300 cursor-pointer">
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
    <div className="p-5 lg:p-8 max-w-6xl mx-auto space-y-5">
      <AdminPageHeader
        title="Aankondigingen"
        subtitle={`${announcements.length} aankondiging${announcements.length !== 1 ? "en" : ""}`}
        action={
          <button
            onClick={() => setDrawer("new")}
            className="flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition-colors shadow-sm"
          >
            <Plus size={16} />
            Nieuwe aankondiging
          </button>
        }
      />

      <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.06] bg-white dark:bg-slate-800/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06] bg-slate-50/80 dark:bg-slate-900/40">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Bericht
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Type
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Geplaatst door
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Acties
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {isLoading ? (
                <AdminTableSkeleton cols={5} />
              ) : announcements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Megaphone size={28} className="opacity-30" />
                      <p className="text-sm">Nog geen aankondigingen geplaatst.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                announcements.map((a) => {
                  const Icon = SEVERITY_ICON[a.severity];
                  return (
                    <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => toggleActive(a)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                            a.active
                              ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/20"
                              : "bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${a.active ? "bg-emerald-500" : "bg-slate-400"}`} />
                          {a.active ? "Actief" : "Inactief"}
                        </button>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm text-slate-900 dark:text-white max-w-md truncate">
                          {a.message}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${SEVERITY_CHIP[a.severity]}`}>
                          <Icon size={11} />
                          {SEVERITY_LABEL[a.severity]}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {a.created_by ?? "—"}
                        </p>
                      </td>
                      <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
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
