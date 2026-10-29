import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { keepPreviousData, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, Copy, Download, ExternalLink, HardDrive, Loader2, Play, Plus, Trash2, UploadCloud, X } from "lucide-react";
import { AdminPage } from "./components/AdminPage";
import { AdminPageHeader } from "./components/AdminPageHeader";
import { L } from "./styles";
import { Segmented } from "../../components/common/Segmented";
import { askConfirm } from "../../store/confirm.store";
import { deleteCdnFile, downloadCdnZip, getAdminCdn, quickUpload, type QuickUploadResult } from "../../services/admin.service";
import { useAdminEvents } from "../../hooks/useAdmin";
import { toast } from "../../store/toast.store";
import { formatBytes, formatDateTime } from "../../utils/format";
import type { CdnObject } from "../../types";
import { EmptyState } from "../../components/common/EmptyState";

// One screenful at a time, in whole rows at 2, 4 and 6 columns. More arrives while scrolling.
const PAGE = 24;

const KIND_LABEL: Record<string, string> = {
  story: "Story-foto's",
  cosplay: "Cosplay",
  banner: "Banners",
  badge: "Badges",
  "event-cover": "Evenementcovers",
  upload: "Uploads",
  other: "Overig",
};

const isVideo = (key: string) => /\.(mp4|mov|webm)$/i.test(key);

// Matches what the server accepts (see admin_quick_upload).
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm";
const IMAGE_MAX = 10 * 1024 * 1024;
const VIDEO_MAX = 80 * 1024 * 1024;

/** Everything in the photo bucket, newest first — to spot anything that shouldn't be there. */
export function AdminCdnPage() {
  const [kind, setKind] = useState<string | null>(null);
  // Only for story photos: their files are stored per event.
  const [eventId, setEventId] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState<number | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const qc = useQueryClient();
  const { data: events = [] } = useAdminEvents();

  const { data: pages, isLoading, isError, error, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteQuery({
    queryKey: ["admin", "cdn", kind, eventId],
    queryFn: ({ pageParam }) => getAdminCdn({ limit: PAGE, offset: pageParam, kind: kind ?? undefined, event: eventId ?? undefined }),
    initialPageParam: 0,
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, page) => n + page.items.length, 0);
      return loaded < last.total ? loaded : undefined;
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  // The totals and counts of the newest page, the files of every page so far.
  const data = pages?.pages[pages.pages.length - 1];
  const items = pages?.pages.flatMap((page) => page.items) ?? [];
  const active = openIndex !== null ? items[openIndex] : undefined;

  // More files when the end of the grid comes near. Watching again after every page, so a
  // tall screen that is still not full keeps loading.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, items.length]);

  // Paging through the viewer should not run into the end of what is loaded.
  useEffect(() => {
    if (openIndex !== null && hasNextPage && !isFetchingNextPage && openIndex >= items.length - 3) void fetchNextPage();
  }, [openIndex, hasNextPage, isFetchingNextPage, items.length, fetchNextPage]);

  function pickKind(next: string | null) {
    setKind(next);
    setEventId(null);
    setOpenIndex(null);
  }

  function pickEvent(next: string | null) {
    setEventId(next);
    setOpenIndex(null);
  }

  const tooBig = !!data && data.download_limit_bytes > 0 && data.total_size > data.download_limit_bytes;
  const downloading = downloaded !== null;
  const scope = eventId ? "dit evenement" : kind ? (KIND_LABEL[kind] ?? kind).toLowerCase() : "alles";

  async function downloadAll() {
    setDownloaded(0);
    try {
      await downloadCdnZip({ kind: kind ?? undefined, event: eventId ?? undefined }, setDownloaded);
      toast("success", "Zip gedownload.");
    } catch (e) {
      toast("error", e instanceof Error && e.message ? e.message : "Downloaden mislukt. Probeer het opnieuw.");
    } finally {
      setDownloaded(null);
    }
  }

  const kindOptions = [
    { value: "all", label: "Alles" },
    ...Object.keys(data?.counts ?? {}).map((k) => ({
      value: k,
      label: (
        <>
          {KIND_LABEL[k] ?? k}
          <span className="font-mono text-xs opacity-70">{data?.counts[k]}</span>
        </>
      ),
      ariaLabel: `${KIND_LABEL[k] ?? k}, ${data?.counts[k]} bestanden`,
    })),
  ];

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Beheer"
        title="CDN"
        subtitle="Elk bestand in de foto-bucket, nieuwste eerst. Kijk of er niets tussen staat dat er niet hoort."
        action={
          <>
            <button
              type="button"
              onClick={() => void downloadAll()}
              disabled={downloading || tooBig || !data || data.total === 0}
              title={tooBig ? "Te veel voor één zip: kies eerst een onderdeel of evenement." : `Download ${scope} als zip`}
              className="btn-primary px-4 disabled:opacity-50"
            >
              {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {downloading ? `Bezig… ${formatBytes(downloaded ?? 0)}` : `Download ${scope} (zip)`}
            </button>
            <button
              type="button"
              onClick={() => setUploading((v) => !v)}
              aria-expanded={uploading}
              className="btn-primary px-4"
            >
              {uploading ? <X size={16} /> : <Plus size={16} />}
              {uploading ? "Sluiten" : "Uploaden"}
            </button>
          </>
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
        <div className="card-surface p-5 text-sm text-bad">
          {error instanceof Error ? error.message : "Kon de bucket niet uitlezen."}
        </div>
      ) : (
        <>
          <p className="flex items-center gap-1.5 font-mono text-xs tabular-nums text-ink-3">
            <HardDrive size={14} />
            {data ? `${data.total} bestanden · ${formatBytes(data.total_size)}` : "…"}
            {data?.capped && " (afgekapt)"}
          </p>

          <Segmented
            label="Soort bestand"
            scroll
            options={kindOptions}
            value={kind ?? "all"}
            onChange={(v) => pickKind(v === "all" ? null : v)}
          />

          {kind === "story" && (
            <div className="sm:max-w-sm">
              <label htmlFor="cdn-event" className={L}>Per evenement</label>
              <select
                id="cdn-event"
                value={eventId ?? ""}
                onChange={(e) => pickEvent(e.target.value || null)}
                className="input-field"
              >
                <option value="">Alle evenementen</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.event_name}</option>
                ))}
              </select>
            </div>
          )}
          {tooBig && (
            <p className="text-xs text-ink-3">
              Dit is meer dan {formatBytes(data?.download_limit_bytes ?? 0)}, te veel voor één zip. Kies een onderdeel{kind === "story" ? " of een evenement" : ""} en download die apart.
            </p>
          )}

          {isLoading ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-xl bg-sunken" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState compact icon={<HardDrive size={22} />} title="Geen bestanden" />
          ) : (
            <div className={`grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6 ${isFetching && !isFetchingNextPage ? "opacity-70" : ""}`}>
              {items.map((o, i) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setOpenIndex(i)}
                  className="relative aspect-square overflow-hidden rounded-xl border-1.5 border-line bg-sunken text-left"
                  title={o.key}
                >
                  {isVideo(o.key) ? (
                    <>
                      <VideoThumb url={o.url} />
                      <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-scrim/60 text-hero-ink">
                        <Play size={12} fill="currentColor" />
                      </span>
                    </>
                  ) : (
                    <img src={o.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-scrim/60 px-2 py-1.5 text-xs font-semibold leading-tight text-hero-ink">
                    <span className="block truncate">{o.owner ?? KIND_LABEL[o.kind] ?? o.kind}</span>
                    <span className="block truncate font-normal text-hero-ink/70">{formatBytes(o.size)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {hasNextPage && (
            <div ref={sentinel} className="flex h-12 items-center justify-center text-ink-3" aria-live="polite">
              {isFetchingNextPage && <Loader2 size={16} className="animate-spin" aria-label="Meer laden" />}
            </div>
          )}
        </>
      )}

      {active && openIndex !== null && (
        <Viewer
          item={active}
          position={`${openIndex + 1} / ${data?.total ?? items.length}`}
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
              toast("error", e instanceof Error ? e.message : "Kon het bestand niet verwijderen. Probeer het opnieuw.");
            }
          }}
        />
      )}
    </AdminPage>
  );
}

/** A video's first frame, fetched only once the tile scrolls near the screen: sixty videos
 * asking for their metadata at once is what made this page slow. */
function VideoThumb({ url }: { url: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setNear(true);
        observer.disconnect();
      }
    }, { rootMargin: "300px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [near]);
  return (
    <div ref={ref} className="h-full w-full">
      {near && <video src={`${url}#t=0.1`} preload="metadata" muted playsInline className="h-full w-full object-cover" />}
    </div>
  );
}

function Viewer({ item, position, onClose, onPrev, onNext, onDelete }: { item: CdnObject; position: string; onClose: () => void; onPrev?: () => void; onNext?: () => void; onDelete: () => Promise<void> }) {
  const [deleting, setDeleting] = useState(false);

  async function askDelete() {
    const ok = await askConfirm({
      title: "Bestand definitief verwijderen?",
      message: "Dit kan niet ongedaan worden gemaakt.",
      confirmLabel: "Verwijderen",
      cancelLabel: "Annuleren",
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    await onDelete();
    setDeleting(false);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev?.();
      if (e.key === "ArrowRight") onNext?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  const arrow = "absolute top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-hero-ink/10 text-hero-ink transition-colors hover:bg-hero-ink/20";
  return createPortal(
    <div className="fixed inset-0 z-[500] flex flex-col bg-scrim/95" onClick={onClose} role="dialog" aria-modal="true" aria-label="Bestand">
      <div className="flex shrink-0 items-start justify-between gap-3 px-4 py-3 text-hero-ink" onClick={(e) => e.stopPropagation()}>
        <div className="min-w-0 text-sm">
          <p className="truncate font-semibold">{item.owner ?? "Onbekende uploader"} · {KIND_LABEL[item.kind] ?? item.kind}</p>
          <p className="truncate font-mono text-xs text-hero-ink/60">{item.key}</p>
          <p className="text-xs text-hero-ink/60">
            {formatBytes(item.size)} · {item.last_modified ? formatDateTime(item.last_modified) : "onbekende datum"} · {position}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => void askDelete()} disabled={deleting} aria-label="Verwijderen" title="Verwijderen" className="hit-area flex h-9 w-9 items-center justify-center rounded-full bg-hero-ink/10 hover:bg-bad-fill disabled:opacity-50">
            <Trash2 size={16} />
          </button>
          <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label="Open in nieuw tabblad" className="hit-area flex h-9 w-9 items-center justify-center rounded-full bg-hero-ink/10 hover:bg-hero-ink/20">
            <ExternalLink size={16} />
          </a>
          <button type="button" onClick={onClose} aria-label="Sluiten" className="hit-area flex h-9 w-9 items-center justify-center rounded-full bg-hero-ink/10 hover:bg-hero-ink/20">
            <X size={16} />
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
      setError(`Te groot: ${formatBytes(file.size)}. Maximaal ${video ? "80" : "10"} MB voor ${video ? "video's" : "afbeeldingen"}.`);
      return;
    }
    setProgress(0);
    try {
      const res = await quickUpload(file, setProgress);
      setResult(res);
      onUploaded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kon het bestand niet uploaden. Probeer het opnieuw.");
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

      {error && <p className="text-sm text-bad" role="alert">{error}</p>}

      {result && (
        <div className="space-y-2">
          <p className="text-xs text-ink-3">
            {result.media === "video" ? "Video" : "Afbeelding"} geüpload · {formatBytes(result.size)}
          </p>
          <div className="flex items-center gap-2">
            <input
              id="quick-upload-url"
              readOnly
              value={result.url}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Link naar het bestand"
              className="input-field min-w-0 flex-1 !bg-sunken font-mono"
            />
            <button type="button" onClick={copy} className="btn-primary inline-flex shrink-0 items-center gap-1.5 px-3">
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Gekopieerd" : "Kopiëren"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
