import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { useUserPhotos } from "../../hooks/useStories";
import { formatDate } from "../../utils/format";
import type { UserStoryPhoto } from "../../types";

const ALL = "all";

/**
 * Every photo someone has put in an event story, newest first, with a chip per
 * event to narrow it down. Tap a photo to see it big and flip through.
 */
export function UserPhotos({ identifier, whose }: { identifier: string; whose?: string }) {
  const { data: photos = [], isLoading } = useUserPhotos(identifier);
  const [eventId, setEventId] = useState<string>(ALL);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const events = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; count: number }>();
    for (const p of photos) {
      const id = p.event_id ?? "unknown";
      const entry = seen.get(id) ?? { id, name: p.event_name ?? "Onbekend event", count: 0 };
      entry.count += 1;
      seen.set(id, entry);
    }
    return [...seen.values()];
  }, [photos]);

  const shown = eventId === ALL ? photos : photos.filter((p) => (p.event_id ?? "unknown") === eventId);
  const active = openIndex !== null ? shown[openIndex] : undefined;

  return (
    <section className="card-surface overflow-hidden">
      <div className="flex items-center gap-2 border-b border-line px-5 pb-3 pt-4 sm:px-6">
        <Images size={14} className="text-ink-3" />
        <p className="section-label">Foto's</p>
        {photos.length > 0 && <span className="font-mono text-[11px] tabular-nums text-ink-3">{photos.length}</span>}
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        {isLoading ? (
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-lg bg-sunken" />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-3">
            {whose ? `${whose} heeft nog geen foto's toegevoegd.` : "Nog geen foto's toegevoegd."}
          </p>
        ) : (
          <>
            {events.length > 1 && (
              <div
                role="group"
                aria-label="Filter op event"
                className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {[{ id: ALL, name: "Alles", count: photos.length }, ...events].map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setEventId(e.id)}
                    aria-pressed={eventId === e.id}
                    className={`shrink-0 rounded-full border-1.5 px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                      eventId === e.id ? "border-outline bg-brand text-brand-on" : "border-line bg-surface text-ink-2 hover:border-ink-3"
                    }`}
                  >
                    {e.name} <span className="font-mono text-[11px] opacity-70">{e.count}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
              {shown.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setOpenIndex(i)}
                  className="group relative aspect-square overflow-hidden rounded-lg bg-sunken"
                >
                  <img
                    src={p.image_url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.04]"
                  />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {active && openIndex !== null && (
        <Lightbox
          photo={active}
          position={`${openIndex + 1} / ${shown.length}`}
          onClose={() => setOpenIndex(null)}
          onPrev={openIndex > 0 ? () => setOpenIndex(openIndex - 1) : undefined}
          onNext={openIndex < shown.length - 1 ? () => setOpenIndex(openIndex + 1) : undefined}
        />
      )}
    </section>
  );
}

function Lightbox({
  photo,
  position,
  onClose,
  onPrev,
  onNext,
}: {
  photo: UserStoryPhoto;
  position: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev?.();
      if (e.key === "ArrowRight") onNext?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  const arrow =
    "absolute top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20";

  return createPortal(
    <div className="fixed inset-0 z-[500] flex flex-col bg-black/95" onClick={onClose} role="dialog" aria-modal="true" aria-label="Foto">
      <div
        className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 text-white"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))" }}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{photo.event_name ?? "Onbekend event"}</p>
          <p className="truncate text-xs text-white/60">
            {[photo.date ? formatDate(photo.date) : null, position].filter(Boolean).join(" · ")}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Sluiten"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
        >
          <X size={18} />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4">
        <img src={photo.image_url} alt="" className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
        {onPrev && (
          <button type="button" aria-label="Vorige" className={`${arrow} left-3`} onClick={(e) => { e.stopPropagation(); onPrev(); }}>
            <ChevronLeft size={22} />
          </button>
        )}
        {onNext && (
          <button type="button" aria-label="Volgende" className={`${arrow} right-3`} onClick={(e) => { e.stopPropagation(); onNext(); }}>
            <ChevronRight size={22} />
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
