import { useState } from "react";
import { MessageSquareText, Trash2 } from "lucide-react";
import { useAdminFeedback, useDeleteFeedback, useUpdateFeedback } from "../../hooks/useFeedback";
import { AdminPageHeader } from "./components/AdminPageHeader";
import { FEEDBACK_KINDS } from "../../components/settings/FeedbackSheet";
import { CHIP_OFF, CHIP_ON, PILL_BAD, PILL_NEUTRAL, PILL_OK, PILL_WARN } from "./styles";
import { formatDateTime } from "../../utils/format";
import { toast } from "../../store/toast.store";
import type { Feedback, FeedbackStatus } from "../../types";

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
    update.mutate({ id: f.id, status }, { onError: () => toast("error", "Kon de status niet wijzigen.") });
  }

  async function handleDelete(id: string) {
    try {
      await remove.mutateAsync(id);
      setConfirmId(null);
      toast("success", "Feedback verwijderd.");
    } catch {
      toast("error", "Kon de feedback niet verwijderen.");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <AdminPageHeader title="Feedback" subtitle={`${count("new")} nieuw · ${items.length} in totaal`} />

      <div className="flex flex-wrap items-center gap-2">
        {filters.map((o) => (
          <button
            key={o.id ?? "all"}
            type="button"
            onClick={() => setFilter(o.id)}
            aria-pressed={filter === o.id}
            className={filter === o.id ? CHIP_ON : CHIP_OFF}
          >
            {o.label} <span className="ml-1 font-mono text-[11px] opacity-70">{o.n}</span>
          </button>
        ))}
      </div>

      {isError ? (
        <div className="card-surface p-5 text-sm text-rose-700 dark:text-rose-300">
          Kon de feedback niet laden. Is migration v2.28 uitgevoerd?
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-sunken" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-ink-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-sunken">
            <MessageSquareText size={22} />
          </span>
          <p className="text-sm">{items.length === 0 ? "Nog geen feedback ontvangen." : "Niets in deze lijst."}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {shown.map((f) => (
            <li key={f.id} className="card-surface space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={KIND_PILL[f.kind]}>{FEEDBACK_KINDS.find((k) => k.id === f.kind)?.label}</span>
                <span className="text-sm font-semibold text-ink">{f.user_name ?? "Anoniem"}</span>
                <span className="font-mono text-[11.5px] text-ink-3">
                  {f.created_at ? formatDateTime(f.created_at) : ""}
                  {f.app_version ? ` · v${f.app_version}` : ""}
                </span>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">{f.message}</p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5" role="group" aria-label="Status">
                  {STATUS_ORDER.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => f.status !== s && setStatus(f, s)}
                      aria-pressed={f.status === s}
                      className={
                        f.status === s
                          ? `${s === "new" ? PILL_WARN : PILL_OK} ring-1 ring-current`
                          : `${PILL_NEUTRAL} hover:text-ink`
                      }
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
                {confirmId === f.id ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-ink-3">Verwijderen?</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(f.id)}
                      disabled={remove.isPending}
                      className="rounded-lg bg-rose-100 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-200 disabled:opacity-50 dark:bg-rose-500/15 dark:text-rose-300"
                    >
                      Ja
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="rounded-lg bg-sunken px-2.5 py-1.5 text-xs font-semibold text-ink-2 hover:text-ink"
                    >
                      Nee
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmId(f.id)}
                    aria-label="Verwijderen"
                    title="Verwijderen"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-sunken hover:text-rose-600"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
