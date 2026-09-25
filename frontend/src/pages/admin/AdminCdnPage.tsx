import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, Copy, ExternalLink, HardDrive, Play, Plus, Trash2, UploadCloud, X } from "lucide-react";
import { AdminPageHeader } from "./components/AdminPageHeader";
import { deleteCdnFile, getAdminCdn, quickUpload, type QuickUploadResult } from "../../services/admin.service";
import { toast } from "../../store/toast.store";
import { formatDateTime } from "../../utils/format";
import type { CdnObject } from "../../types";

const PAGE = 60;

const KIND_LABEL: Record<string, string> = {
  story: "Story-foto's",
  cosplay: "Cosplay",
  banner: "Banners",
  badge: "Badges",
  "event-cover": "Event-covers",
  upload: "Uploads",
  other: "Overig",
};

const isVideo = (key: string) => /\.(mp4|mov|webm)$/i.test(key);

// Matches what the server accepts (see admin_quick_upload).
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm";
const IMAGE_MAX = 10 * 1024 * 1024;
const VIDEO_MAX = 80 * 1024 * 1024;

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
  const [uploading, setUploading] = useState(false);
  const qc = useQueryClient();

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
        action={
          <button
            type="button"
            onClick={() => setUploading((v) => !v)}
            aria-expanded={uploading}
            className="btn-primary inline-flex items-center gap-1.5 px-4 py-2.5 text-sm"
          >
            {uploading ? <X size={16} /> : <Plus size={16} />}
            {uploading ? "Sluiten" : "Uploaden"}
          </button>
        }
      />

      {uploading && (
        <QuickUpload
          onUploaded={() => {
            qc.invalidateQueries({ queryKey: ["admin", "cdn"] });
          }}
        />
      )}

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
                  {isVideo(o.key) ? (
                    <>
                      <video src={`${o.url}#t=0.1`} preload="metadata" muted playsInline className="h-full w-full object-cover" />
                      <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white">
                        <Play size={11} fill="currentColor" />
                      </span>
                    </>
                  ) : (
                    <img src={o.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.04]" />
                  )}
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
          onDelete={async () => {
            try {
              await deleteCdnFile(active.key);
              toast("success", "Bestand verwijderd.");
              setOpenIndex(null);
              await qc.invalidateQueries({ queryKey: ["admin", "cdn"] });
            } catch (e) {
              toast("error", e instanceof Error ? e.message : "Verwijderen mislukt.");
            }
          }}
        />
      )}
    </div>
  );
}

function Viewer({ item, position, onClose, onPrev, onNext, onDelete }: { item: CdnObject; position: string; onClose: () => void; onPrev?: () => void; onNext?: () => void; onDelete: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // A new file starts unconfirmed, so one tap never deletes the next one.
  useEffect(() => setConfirming(false), [item.key]);

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
          {confirming ? (
            <>
              <button type="button" onClick={() => setConfirming(false)} className="h-9 rounded-full bg-white/10 px-3 text-xs font-semibold hover:bg-white/20">
                Annuleer
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  await onDelete();
                  setDeleting(false);
                  setConfirming(false);
                }}
                className="h-9 rounded-full bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {deleting ? "Bezig…" : "Definitief verwijderen"}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} aria-label="Verwijderen" title="Verwijderen" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-rose-600">
              <Trash2 size={16} />
            </button>
          )}
          <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label="Open in nieuw tabblad" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
            <ExternalLink size={16} />
          </a>
          <button type="button" onClick={onClose} aria-label="Sluiten" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4">
        {isVideo(item.key) ? (
          <video key={item.url} src={item.url} controls playsInline className="max-h-full max-w-full" onClick={(e) => e.stopPropagation()} />
        ) : (
          <img src={item.url} alt="" className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
        )}
        {onPrev && <button type="button" aria-label="Vorige" className={`${arrow} left-3`} onClick={(e) => { e.stopPropagation(); onPrev(); }}><ChevronLeft size={22} /></button>}
        {onNext && <button type="button" aria-label="Volgende" className={`${arrow} right-3`} onClick={(e) => { e.stopPropagation(); onNext(); }}><ChevronRight size={22} /></button>}
      </div>
    </div>,
    document.body,
  );
}

/** Pick an image or video, get a link to embed it. Anything else is refused by the server. */
function QuickUpload({ onUploaded }: { onUploaded: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuickUploadResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function send(file: File | undefined) {
    if (!file) return;
    setError(null);
    setResult(null);
    const video = file.type.startsWith("video/");
    if (!video && !file.type.startsWith("image/")) {
      setError("Kies een afbeelding (JPG, PNG, WebP, GIF) of video (MP4, MOV, WebM).");
      return;
    }
    if (file.size > (video ? VIDEO_MAX : IMAGE_MAX)) {
      setError(`Te groot: ${formatSize(file.size)}. Maximaal ${video ? "80" : "10"} MB voor ${video ? "video's" : "afbeeldingen"}.`);
      return;
    }
    setProgress(0);
    try {
      const res = await quickUpload(file, setProgress);
      setResult(res);
      onUploaded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Uploaden mislukt.");
    } finally {
      setProgress(null);
      if (input.current) input.current.value = "";
    }
  }

  function copy() {
    if (!result) return;
    navigator.clipboard.writeText(result.url).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    });
  }

  const busy = progress !== null;
  const pct = Math.round((progress ?? 0) * 100);
  return (
    <div className="card-surface space-y-3 p-4">
      <input ref={input} id="quick-upload-file" type="file" accept={ACCEPT} className="sr-only" onChange={(e) => void send(e.target.files?.[0])} />
      <label
        htmlFor="quick-upload-file"
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (!busy) void send(e.dataTransfer.files?.[0]); }}
        className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-1.5 border-dashed px-4 py-6 text-center transition-colors ${
          dragging ? "border-outline bg-sunken" : "border-line hover:border-ink-3"
        } ${busy ? "pointer-events-none opacity-70" : ""}`}
      >
        <UploadCloud size={22} className="text-ink-3" />
        <span className="text-sm font-semibold text-ink">{busy ? `Uploaden… ${pct}%` : "Kies een bestand of sleep het hierheen"}</span>
        <span className="text-xs text-ink-3">Afbeelding (JPG, PNG, WebP, GIF, max 10 MB) of video (MP4, MOV, WebM, max 80 MB)</span>
        {busy && (
          <span className="mt-1 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-sunken">
            <span className="block h-full rounded-full bg-brand transition-[width]" style={{ width: `${pct}%` }} />
          </span>
        )}
      </label>

      {error && <p className="text-sm text-rose-700 dark:text-rose-300" role="alert">{error}</p>}

      {result && (
        <div className="space-y-2">
          <p className="text-xs text-ink-3">
            {result.media === "video" ? "Video" : "Afbeelding"} geüpload · {formatSize(result.size)}
          </p>
          <div className="flex items-center gap-2">
            <input
              id="quick-upload-url"
              readOnly
              value={result.url}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Link naar het bestand"
              className="min-w-0 flex-1 rounded-lg border-1.5 border-line bg-sunken px-3 py-2 font-mono text-[12px] text-ink"
            />
            <button type="button" onClick={copy} className="btn-secondary inline-flex shrink-0 items-center gap-1.5 px-3 py-2 text-sm">
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? "Gekopieerd" : "Kopieer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
