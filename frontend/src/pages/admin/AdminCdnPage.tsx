import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ExternalLink, HardDrive, X } from "lucide-react";
import { AdminPageHeader } from "./components/AdminPageHeader";
import { getAdminCdn } from "../../services/admin.service";
import { formatDateTime } from "../../utils/format";
import type { CdnObject } from "../../types";

const PAGE = 60;

const KIND_LABEL: Record<string, string> = {
  story: "Story-foto's",
  cosplay: "Cosplay",
  banner: "Banners",
  badge: "Badges",
  "event-cover": "Event-covers",
  other: "Overig",
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/** Everything in the photo bucket, newest first — to spot anything that shouldn't be there. */
export function AdminCdnPage() {
  const [kind, setKind] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["admin", "cdn", kind, limit],
    queryFn: () => getAdminCdn({ limit, offset: 0, kind: kind ?? undefined }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const items = data?.items ?? [];
  const active = openIndex !== null ? items[openIndex] : undefined;

  function pickKind(next: string | null) {
    setKind(next);
    setLimit(PAGE);
    setOpenIndex(null);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <AdminPageHeader
        title="CDN"
        subtitle="Elk bestand in de foto-bucket, nieuwste eerst. Bekijk of er niets tussen staat dat er niet hoort."
      />

      {isError ? (
        <div className="card-surface p-5 text-sm text-rose-700 dark:text-rose-300">
          {error instanceof Error ? error.message : "Kon de bucket niet uitlezen."}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 font-mono text-[12px] tabular-nums text-ink-3">
              <HardDrive size={13} />
              {data ? `${data.total} bestanden · ${formatSize(data.total_size)}` : "…"}
              {data?.capped && " (afgekapt)"}
            </span>
            <span className="mx-1 hidden h-4 w-px bg-line sm:block" />
            {[{ id: null as string | null, label: "Alles" }, ...Object.keys(data?.counts ?? {}).map((k) => ({ id: k as string | null, label: KIND_LABEL[k] ?? k }))].map((opt) => (
              <button
                key={opt.id ?? "all"}
                type="button"
                onClick={() => pickKind(opt.id)}
                aria-pressed={kind === opt.id}
                className={`rounded-full border-1.5 px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                  kind === opt.id ? "border-outline bg-brand text-brand-on" : "border-line bg-surface text-ink-2 hover:border-ink-3"
                }`}
              >
                {opt.label}
                {opt.id && <span className="ml-1.5 font-mono text-[11px] opacity-70">{data?.counts[opt.id]}</span>}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-xl bg-sunken" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-3">Geen bestanden.</p>
          ) : (
            <div className={`grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6 ${isFetching ? "opacity-70" : ""}`}>
              {items.map((o, i) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setOpenIndex(i)}
                  className="group relative aspect-square overflow-hidden rounded-xl border-1.5 border-line bg-sunken text-left"
                  title={o.key}
                >
                  <img src={o.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.04]" />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2 pb-1.5 pt-6 text-[11px] font-semibold leading-tight text-white">
                    <span className="block truncate">{o.owner ?? KIND_LABEL[o.kind] ?? o.kind}</span>
                    <span className="block truncate font-normal text-white/70">{formatSize(o.size)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {data && data.total > items.length && (
            <div className="flex justify-center">
              <button type="button" onClick={() => setLimit((l) => l + PAGE)} disabled={isFetching} className="btn-secondary px-4 py-2.5 text-sm">
                Toon meer ({data.total - items.length} te gaan)
              </button>
            </div>
          )}
        </>
      )}

      {active && openIndex !== null && (
        <Viewer
          item={active}
          position={`${openIndex + 1} / ${items.length}`}
          onClose={() => setOpenIndex(null)}
          onPrev={openIndex > 0 ? () => setOpenIndex(openIndex - 1) : undefined}
          onNext={openIndex < items.length - 1 ? () => setOpenIndex(openIndex + 1) : undefined}
        />
      )}
    </div>
  );
}

function Viewer({ item, position, onClose, onPrev, onNext }: { item: CdnObject; position: string; onClose: () => void; onPrev?: () => void; onNext?: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev?.();
      if (e.key === "ArrowRight") onNext?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  const arrow = "absolute top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20";
  return createPortal(
    <div className="fixed inset-0 z-[500] flex flex-col bg-black/95" onClick={onClose} role="dialog" aria-modal="true" aria-label="Bestand">
      <div className="flex shrink-0 items-start justify-between gap-3 px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
        <div className="min-w-0 text-sm">
          <p className="truncate font-semibold">{item.owner ?? "Onbekende uploader"} · {KIND_LABEL[item.kind] ?? item.kind}</p>
          <p className="truncate font-mono text-[11.5px] text-white/60">{item.key}</p>
          <p className="text-xs text-white/60">
            {formatSize(item.size)} · {item.last_modified ? formatDateTime(item.last_modified) : "onbekende datum"} · {position}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label="Open in nieuw tabblad" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
            <ExternalLink size={16} />
          </a>
          <button type="button" onClick={onClose} aria-label="Sluiten" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4">
        <img src={item.url} alt="" className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
        {onPrev && <button type="button" aria-label="Vorige" className={`${arrow} left-3`} onClick={(e) => { e.stopPropagation(); onPrev(); }}><ChevronLeft size={22} /></button>}
        {onNext && <button type="button" aria-label="Volgende" className={`${arrow} right-3`} onClick={(e) => { e.stopPropagation(); onNext(); }}><ChevronRight size={22} /></button>}
      </div>
    </div>,
    document.body,
  );
}
