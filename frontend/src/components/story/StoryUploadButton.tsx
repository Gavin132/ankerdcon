import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { compressImage } from "../../utils/imageCompression";
import { useUploadStoryPhoto } from "../../hooks/useStories";
import { toast } from "../../store/toast.store";

interface StoryUploadButtonProps {
  eventDayId: string;
}

/** Icon-only "add a photo to this day's story" button — sized and styled to
 * sit alongside the other icon buttons in DetailTopbar. */
export function StoryUploadButton({ eventDayId }: StoryUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [compressing, setCompressing] = useState(false);
  const uploadMutation = useUploadStoryPhoto(eventDayId);

  async function handleFile(file: File | undefined) {
    if (!file) return;
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
        title="Foto toevoegen aan story"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-1.5 border-line bg-surface
                   text-ink-2 transition-colors hover:border-ink-3 hover:text-ink
                   disabled:opacity-50"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
      </button>
    </>
  );
}
