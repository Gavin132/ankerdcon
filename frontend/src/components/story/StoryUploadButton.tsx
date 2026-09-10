import { useRef, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { compressImage } from "../../utils/imageCompression";
import { useUploadStoryPhoto } from "../../hooks/useStories";
import { toast } from "../../store/toast.store";

interface StoryUploadButtonProps {
  eventDayId: string;
  className?: string;
}

export function StoryUploadButton({ eventDayId, className = "" }: StoryUploadButtonProps) {
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
        className={`flex items-center gap-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-60 px-3 py-2 text-xs font-bold text-white transition-colors ${className}`}
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
        {busy ? "Bezig…" : "Foto toevoegen"}
      </button>
    </>
  );
}
