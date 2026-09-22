import { useRef, useState } from "react";
import { ImagePlus, Plus, Loader2, UploadCloud } from "lucide-react";
import { compressImage } from "../../utils/imageCompression";
import { useUploadStoryPhoto } from "../../hooks/useStories";
import { usePendingStoryUploadsStore } from "../../store/pendingStoryUploads.store";
import { queueOrToastUploadError } from "../../utils/pendingStoryUploadUi";
import { toast } from "../../store/toast.store";

interface AddStoryTileProps {
  /** The day a photo added here lands in, by upload time — never the day
   * the photo itself depicts. `null` when no trip day is open for upload
   * yet (see the 1-day-early buffer in HubPage), rendering a grayed-out,
   * non-interactive version so the feature is still discoverable. */
  eventDayId: string | null;
}

/** Instagram-style "add to your story" tile — a dashed camera circle with a
 * small plus badge overlapping its corner, always the first tile in the
 * Hub's story row. */
export function AddStoryTile({ eventDayId }: AddStoryTileProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [compressing, setCompressing] = useState(false);
  const uploadMutation = useUploadStoryPhoto(eventDayId ?? "");
  const pendingCount = usePendingStoryUploadsStore((s) =>
    eventDayId ? s.items.filter((i) => i.eventDayId === eventDayId).length : 0,
  );

  async function handleFile(file: File | undefined) {
    if (!file || !eventDayId) return;
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
  const disabled = eventDayId === null;

  function handleClick() {
    if (disabled) {
      toast("info", "Er is nog geen evenement om foto's aan toe te voegen.");
      return;
    }
    inputRef.current?.click();
  }

  return (
    <div className={`flex flex-col items-center gap-1.5 shrink-0 w-16 ${disabled ? "opacity-40" : ""}`}>
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
        onClick={handleClick}
        className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-ink-3/60 transition-colors hover:border-ink-3 disabled:cursor-not-allowed"
      >
        {busy ? (
          <Loader2 size={18} className="animate-spin text-ink-3" />
        ) : pendingCount > 0 ? (
          <UploadCloud size={18} className="text-amber-600 dark:text-amber-400" />
        ) : (
          <ImagePlus size={18} className="text-ink-3" />
        )}
        <span
          className={`absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-1.5 ${
            disabled ? "border-line bg-sunken text-ink-3" : "border-outline bg-brand text-brand-on"
          }`}
        >
          <Plus size={12} strokeWidth={3} />
        </span>
        {pendingCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 font-mono text-[9px] font-bold text-white">
            {pendingCount}
          </span>
        )}
      </button>
      <span className="max-w-full truncate font-mono text-[10.5px] font-semibold uppercase text-ink-2">
        Toevoegen
      </span>
    </div>
  );
}
