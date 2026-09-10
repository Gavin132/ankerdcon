import { useRef, useState } from "react";
import { ImagePlus, Plus, Loader2 } from "lucide-react";
import { compressImage } from "../../utils/imageCompression";
import { useUploadStoryPhoto } from "../../hooks/useStories";
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

  async function handleFile(file: File | undefined) {
    if (!file || !eventDayId) return;
    setCompressing(true);
    try {
      const blob = await compressImage(file);
      await uploadMutation.mutateAsync(blob);
      toast("success", "Foto toegevoegd aan de story!");
    } catch {
      toast("error", "Kon foto niet uploaden. Probeer opnieuw.");
    } finally {
      setCompressing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const busy = compressing || uploadMutation.isPending;
  const disabled = eventDayId === null;

  function handleClick() {
    if (disabled) {
      toast("info", "Nog even geduld — uploaden kan vanaf de dag voor het evenement.");
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
        className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 disabled:cursor-not-allowed"
      >
        {busy ? (
          <Loader2 size={18} className="animate-spin text-slate-400 dark:text-slate-500" />
        ) : (
          <ImagePlus size={18} className="text-slate-300 dark:text-slate-600" />
        )}
        <span
          className={`absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full text-white ring-2 ring-white dark:ring-slate-950 ${
            disabled ? "bg-slate-400 dark:bg-slate-600" : "gradient-brand"
          }`}
        >
          <Plus size={12} strokeWidth={3} />
        </span>
      </button>
      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate max-w-full">
        Toevoegen
      </span>
    </div>
  );
}
