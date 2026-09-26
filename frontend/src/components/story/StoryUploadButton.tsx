import { useRef, useState } from "react";
import { ImagePlus, Loader2, UploadCloud } from "lucide-react";
import { compressImage } from "../../utils/imageCompression";
import { useUploadStoryPhoto } from "../../hooks/useStories";
import { usePendingStoryUploadsStore } from "../../store/pendingStoryUploads.store";
import { queueOrToastUploadError } from "../../utils/pendingStoryUploadUi";
import { toast } from "../../store/toast.store";

interface StoryUploadButtonProps {
  eventDayId: string;
  /** Overrides the default neutral icon-button look — e.g. a bolder brand-blue
   * treatment when this sits somewhere that needs to read as the primary action. */
  className?: string;
}

const DEFAULT_CLASS =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-1.5 border-line bg-surface " +
  "text-ink-2 transition-colors hover:border-ink-3 hover:text-ink disabled:opacity-50";

/** Icon-only "add a photo to this day's story" button — sized and styled to
 * sit alongside the other icon buttons in DetailTopbar. */
export function StoryUploadButton({ eventDayId, className }: StoryUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [compressing, setCompressing] = useState(false);
  const uploadMutation = useUploadStoryPhoto(eventDayId);
  const pendingCount = usePendingStoryUploadsStore((s) => s.items.filter((i) => i.eventDayId === eventDayId).length);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setCompressing(true);
    let blob: Blob;
    try {
      blob = await compressImage(file);
    } catch {
      toast("error", "Kon foto niet verwerken. Probeer een andere foto.");
      setCompressing(false);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setCompressing(false);

    // No point waiting out a full request timeout when the browser already
    // knows it's offline — queue it straight away.
    if (!navigator.onLine) {
      await queueOrToastUploadError(eventDayId, blob, { isOffline: true });
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    try {
      await uploadMutation.mutateAsync(blob);
      toast("success", "Foto toegevoegd aan de story!");
    } catch (err) {
      await queueOrToastUploadError(eventDayId, blob, err);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const busy = compressing || uploadMutation.isPending;

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        title={pendingCount > 0 ? `${pendingCount} foto('s) wachten op verbinding` : "Foto toevoegen aan story"}
        className={`relative ${className ?? DEFAULT_CLASS}`}
      >
        {busy ? (
          <Loader2 size={16} className="animate-spin" />
        ) : pendingCount > 0 ? (
          <UploadCloud size={16} className="text-amber-600 dark:text-amber-400" />
        ) : (
          <ImagePlus size={16} />
        )}
        {pendingCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 font-mono text-[9px] font-bold text-white">
            {pendingCount}
          </span>
        )}
      </button>
    </>
  );
}
