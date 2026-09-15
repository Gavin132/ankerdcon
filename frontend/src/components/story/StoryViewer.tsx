import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Share2, Download, Loader2 } from "lucide-react";
import { useStoryPhotos, useMarkStorySeen, useDeleteStoryPhoto } from "../../hooks/useStories";
import { useCurrentUser } from "../../hooks/useUsers";
import { downloadStoryPhoto } from "../../services/stories.service";
import { toast } from "../../store/toast.store";
import { UserAvatar } from "../common/UserAvatar";
import type { StoryPhoto } from "../../types";

const SLIDE_DURATION_MS = 5000;

interface StoryViewerProps {
  eventDayId: string;
  open: boolean;
  onClose: () => void;
  /** Photo to start on (position in the day's story). Defaults to the first. */
  initialIndex?: number;
}

/** Full-screen Instagram-style tap-through photo story. */
export function StoryViewer({ eventDayId, open, onClose, initialIndex = 0 }: StoryViewerProps) {
  // Latched, not the raw prop — a caller that stores "which day is open" as
  // a single `string | null` (see HubPage.tsx) naturally passes an empty
  // string in the same render that flips `open` to false, while the exit
  // fade is still playing. Latching onto the last real id keeps every hook
  // below correctly scoped for the whole close animation instead of firing
  // requests against an empty id.
  const [activeEventDayId, setActiveEventDayId] = useState(eventDayId);
  useEffect(() => {
    if (eventDayId) setActiveEventDayId(eventDayId);
  }, [eventDayId]);

  // `open` alone isn't enough to gate the fetch: on the render where a story
  // first opens, `open` flips true one render before the latching effect
  // above has a chance to run, so `activeEventDayId` can still be the
  // initial empty string for that one render — firing a request against
  // "" (a 404, since the backend route needs a real id segment). Requiring
  // a non-empty id too keeps the query disabled until the effect catches up.
  const { data: photos = [] } = useStoryPhotos(activeEventDayId, { enabled: open && !!activeEventDayId });
  const { data: me } = useCurrentUser();
  const markSeen = useMarkStorySeen(activeEventDayId);
  const deletePhoto = useDeleteStoryPhoto(activeEventDayId);

  const [index, setIndex] = useState(0);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const highestSeqRef = useRef(0);

  useEffect(() => {
    if (open) {
      setIndex(initialIndex);
      highestSeqRef.current = 0;
    }
  }, [open, eventDayId]);

  useEffect(() => {
    const photo = photos[index];
    if (photo) highestSeqRef.current = Math.max(highestSeqRef.current, photo.seq);
  }, [index, photos]);

  const flushSeen = useCallback(() => {
    if (highestSeqRef.current > 0) markSeen.mutate(highestSeqRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventDayId]);

  const handleClose = useCallback(() => {
    flushSeen();
    onClose();
  }, [flushSeen, onClose]);

  const next = useCallback(() => {
    // Side effects (flushSeen/onClose) belong here, in the event handler —
    // not inside the setIndex updater, which StrictMode double-invokes in
    // dev and would otherwise fire them twice.
    if (index + 1 >= photos.length) {
      flushSeen();
      onClose();
      return;
    }
    setIndex(index + 1);
  }, [index, photos.length, flushSeen, onClose]);

  const prev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  async function handleShare(imageUrl: string) {
    if (navigator.share) {
      try {
        await navigator.share({ url: imageUrl });
        return;
      } catch (err) {
        // AbortError just means the user dismissed the native share sheet —
        // leave it at that instead of surprising them with a clipboard copy.
        if ((err as Error)?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(imageUrl);
      toast("success", "Link gekopieerd!");
    } catch {
      toast("error", "Kon niet delen.");
    }
  }

  async function handleDownload(photo: StoryPhoto) {
    setDownloadingId(photo.id);
    try {
      const blob = await downloadStoryPhoto(photo.id);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `ankerd-story-${photo.created_at.slice(0, 10)}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast("error", "Kon foto niet downloaden.");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(photoId: string) {
    try {
      await deletePhoto.mutateAsync(photoId);
      toast("success", "Foto verwijderd.");
      if (photos.length <= 1) handleClose();
      else if (index >= photos.length - 1) setIndex(Math.max(0, index - 1));
    } catch {
      toast("error", "Kon foto niet verwijderen.");
    }
  }

  if (typeof window === "undefined") return null;

  const current = photos[index];

  return createPortal(
    <AnimatePresence>
      {open && current && (
        <motion.div
          className="fixed inset-0 z-[600] flex flex-col bg-[#080C0F]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Progress bars */}
          <div className="flex gap-1 px-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] shrink-0">
            {photos.map((p, i) => (
              <div key={p.id} className="h-[3px] flex-1 rounded-full bg-white/25 overflow-hidden">
                {i < index && <div className="h-full w-full bg-white" />}
                {i === index && (
                  <motion.div
                    key={index}
                    className="h-full bg-white origin-left"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: SLIDE_DURATION_MS / 1000, ease: "linear" }}
                    onAnimationComplete={next}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <UserAvatar name={current.uploaded_by} className="h-6 w-6 text-[9px] !border-0" />
              <p className="truncate text-xs font-semibold text-[#E6F0F3]">{current.uploaded_by}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleShare(current.image_url)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#E6F0F3]/75 transition-colors hover:bg-white/10 hover:text-[#E6F0F3]"
              >
                <Share2 size={16} />
              </button>
              <button
                type="button"
                disabled={downloadingId === current.id}
                onClick={() => handleDownload(current)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#E6F0F3]/75 transition-colors hover:bg-white/10 hover:text-[#E6F0F3] disabled:opacity-50"
              >
                {downloadingId === current.id ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
              </button>
              {me?.name === current.uploaded_by && (
                <button
                  type="button"
                  onClick={() => handleDelete(current.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[#E6F0F3]/75 transition-colors hover:bg-white/10 hover:text-[#E6F0F3]"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={handleClose}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#E6F0F3]/75 transition-colors hover:bg-white/10 hover:text-[#E6F0F3]"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Photo + tap zones */}
          <div className="relative flex-1 min-h-0">
            <img
              src={current.image_url}
              alt=""
              className="absolute inset-0 h-full w-full object-contain"
            />
            <button type="button" aria-label="Vorige" onClick={prev} className="absolute inset-y-0 left-0 w-1/3" />
            <button type="button" aria-label="Volgende" onClick={next} className="absolute inset-y-0 right-0 w-2/3" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
