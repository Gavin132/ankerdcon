import { useNavigate } from "react-router-dom";
import { Check, Sparkles } from "lucide-react";
import { DetailTopbar } from "../components/detail/DetailTopbar";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { EmptyState } from "../components/common/EmptyState";
import { useChangelog } from "../hooks/useChangelog";

function formatReleaseDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

export function ChangelogPage() {
  const navigate = useNavigate();
  const { data: entries, isLoading } = useChangelog();

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950">
      <DetailTopbar title="Wat is nieuw" onBack={() => navigate(-1)} />

      <div
        className="mx-auto max-w-lg px-5 py-6 space-y-5"
        style={{ paddingBottom: "max(3rem, env(safe-area-inset-bottom, 0px))" }}
      >
        {isLoading && (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        )}

        {!isLoading && (entries ?? []).length === 0 && (
          <EmptyState icon={<Sparkles size={36} />} title="Nog geen updates" description="Hier verschijnen nieuwe features en verbeteringen zodra ze er zijn." />
        )}

        {!isLoading &&
          (entries ?? []).map((entry) => (
            <div
              key={entry.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5"
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500 mb-1">
                {formatReleaseDate(entry.released_at)}
              </p>
              <h2 className="text-base font-black text-slate-900 dark:text-white mb-3">{entry.title}</h2>
              <ul className="space-y-2">
                {entry.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    <Check size={14} className="shrink-0 mt-0.5 text-emerald-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </div>
    </div>
  );
}
