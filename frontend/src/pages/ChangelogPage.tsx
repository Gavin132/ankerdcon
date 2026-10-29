import { Check, Sparkles } from "lucide-react";
import { DetailTopbar } from "../components/detail/DetailTopbar";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { EmptyState } from "../components/common/EmptyState";
import { useChangelog } from "../hooks/useChangelog";
import { useSmartBack } from "../hooks/useSmartBack";
import { routes } from "../config/routes";

function formatReleaseDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

/** A release titled with just its number ("2.19.0") reads as "Versie 2.19.0". */
const releaseTitle = (title: string) => (/^v?\d+(\.\d+)+$/.test(title.trim()) ? `Versie ${title.trim().replace(/^v/, "")}` : title);

export function ChangelogPage() {
  const goBack = useSmartBack(routes.hub);
  const { data: entries, isLoading } = useChangelog();

  return (
    <div className="min-h-[100dvh] bg-paper">
      <DetailTopbar title="Wat is nieuw" onBack={goBack} width="2xl" />

      <div
        className="mx-auto max-w-2xl space-y-5 px-4 py-5 sm:py-8"
        style={{ paddingBottom: "max(3rem, env(safe-area-inset-bottom, 0px))" }}
      >
        {isLoading && (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        )}

        {!isLoading && (entries ?? []).length === 0 && (
          <EmptyState icon={<Sparkles size={22} />} title="Nog geen updates" description="Hier verschijnen nieuwe features en verbeteringen zodra ze er zijn." />
        )}

        {!isLoading &&
          (entries ?? []).map((entry) => (
            <div
              key={entry.id}
              className="card-surface overflow-hidden p-5"
            >
              <p className="text-xs text-ink-3">
                {formatReleaseDate(entry.released_at)}
              </p>
              <h2 className="mb-3 mt-1 font-display text-[24px] font-extrabold uppercase leading-[0.95] text-ink">{releaseTitle(entry.title)}</h2>
              <ul className="space-y-2 border-t border-line pt-3">
                {entry.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-ink-2">
                    <Check size={14} className="mt-[3px] shrink-0 text-ink-3" />
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
