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
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl
                   text-slate-500 dark:text-slate-400
                   hover:bg-slate-100 dark:hover:bg-white/[0.08]
                   hover:text-slate-900 dark:hover:text-white transition-colors
                   disabled:opacity-50"
      >
        {busy ? <Loader2 size={17} className="animate-spin" /> : <ImagePlus size={17} />}
      </button>
    </>
  );
}
