import { useState } from "react";
import { MessageSquareText, Trash2 } from "lucide-react";
import { useAdminFeedback, useDeleteFeedback, useUpdateFeedback } from "../../hooks/useFeedback";
import { AdminPage } from "./components/AdminPage";
import { AdminPageHeader } from "./components/AdminPageHeader";
import { ConfirmInline } from "./components/ConfirmInline";
import { FEEDBACK_KINDS } from "../../components/settings/FeedbackSheet";
import { CHIP_OFF, CHIP_ON, PILL_BAD, PILL_NEUTRAL, PILL_OK } from "./styles";
import { formatDateTime } from "../../utils/format";
import { toast } from "../../store/toast.store";
import type { Feedback, FeedbackStatus } from "../../types";
import { EmptyState } from "../../components/common/EmptyState";

const STATUS_LABEL: Record<FeedbackStatus, string> = { new: "Nieuw", seen: "Gezien", done: "Opgelost" };
const STATUS_ORDER: FeedbackStatus[] = ["new", "seen", "done"];
const KIND_PILL = { bug: PILL_BAD, idea: PILL_OK, other: PILL_NEUTRAL } as const;

/** What members sent through Instellingen › Feedback geven, newest first. */
export function AdminFeedbackPage() {
  const { data: items = [], isLoading, isError } = useAdminFeedback();
  const update = useUpdateFeedback();
  const remove = useDeleteFeedback();
  const [filter, setFilter] = useState<FeedbackStatus | null>("new");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const count = (s: FeedbackStatus) => items.filter((f) => f.status === s).length;
  const shown = filter ? items.filter((f) => f.status === filter) : items;
  const filters: { id: FeedbackStatus | null; label: string; n: number }[] = [
    { id: null, label: "Alles", n: items.length },
    ...STATUS_ORDER.map((s) => ({ id: s, label: STATUS_LABEL[s], n: count(s) })),
  ];

  function setStatus(f: Feedback, status: FeedbackStatus) {
    update.mutate({ id: f.id, status }, { onError: () => toast("error", "Kon de status niet wijzigen. Probeer het opnieuw.") });
  }

  async function handleDelete(id: string) {
    try {
      await remove.mutateAsync(id);
      setConfirmId(null);
      toast("success", "Feedback verwijderd.");
    } catch {
      toast("error", "Kon de feedback niet verwijderen. Probeer het opnieuw.");
    }
  }

  return (
    <AdminPage width="narrow">
      <AdminPageHeader title="Feedback" subtitle={`${count("new")} nieuw · ${items.length} in totaal`} />

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter op status">
        {filters.map((o) => (
          <button
            key={o.id ?? "all"}
            type="button"
            onClick={() => setFilter(o.id)}
            aria-pressed={filter === o.id}
            className={filter === o.id ? CHIP_ON : CHIP_OFF}
          >
            {o.label} <span className="font-mono text-xs opacity-70">{o.n}</span>
          </button>
        ))}
      </div>

      {isError ? (
        <div className="card-surface p-5 text-sm text-bad">
          Kon de feedback niet laden. Is migration v2.28 uitgevoerd?
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-sunken" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <EmptyState icon={<MessageSquareText size={22} />} title={items.length === 0 ? "Nog geen feedback ontvangen" : "Niets in deze lijst"} />
      ) : (
        <ul className="space-y-3">
          {shown.map((f) => (
            <li key={f.id} className="card-surface space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={KIND_PILL[f.kind]}>{FEEDBACK_KINDS.find((k) => k.id === f.kind)?.label}</span>
                <span className="text-sm font-semibold text-ink">{f.user_name ?? "Anoniem"}</span>
                <span className="font-mono text-xs text-ink-3">
                  {f.created_at ? formatDateTime(f.created_at) : ""}
                  {f.app_version ? ` · v${f.app_version}` : ""}
                </span>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">{f.message}</p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2" role="group" aria-label="Status">
                  {STATUS_ORDER.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => f.status !== s && setStatus(f, s)}
                      aria-pressed={f.status === s}
                      className={f.status === s ? CHIP_ON : CHIP_OFF}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
                {confirmId === f.id ? (
                  <ConfirmInline isPending={remove.isPending} onConfirm={() => handleDelete(f.id)} onCancel={() => setConfirmId(null)} />
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmId(f.id)}
                    aria-label={`Feedback van ${f.user_name ?? "anoniem"} verwijderen`}
                    title="Verwijderen"
                    className="icon-btn hover:!text-bad"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminPage>
  );
}
