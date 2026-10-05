import { ImagePlus, Loader2, UploadCloud } from "lucide-react";
import { useStoryPhotoPicker } from "../../hooks/useStoryPhotoPicker";
import { usePendingStoryUploadsStore } from "../../store/pendingStoryUploads.store";

interface StoryUploadButtonProps {
  eventDayId: string;
  /** Overrides the default neutral icon-button look — e.g. a bolder brand-blue
   * treatment when this sits somewhere that needs to read as the primary action. */
  className?: string;
}

const DEFAULT_CLASS =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-1.5 border-line bg-surface " +
  "text-ink-2 transition-colors hover:border-ink-3 hover:text-ink disabled:opacity-50";

/** Icon-only "add photos to this day's story" button — sized and styled to
 * sit alongside the other icon buttons in DetailTopbar. Takes several photos at
 * once and adds them in the order they were taken. */
export function StoryUploadButton({ eventDayId, className }: StoryUploadButtonProps) {
  const picker = useStoryPhotoPicker(eventDayId);
  const pendingCount = usePendingStoryUploadsStore((s) => s.items.filter((i) => i.eventDayId === eventDayId).length);
  const { progress } = picker;

  return (
    <>
      <input ref={picker.inputRef} {...picker.inputProps} />
      <button
        type="button"
        disabled={picker.busy}
        onClick={picker.open}
        title={
          progress
            ? `Foto ${Math.min(progress.done + 1, progress.total)} van ${progress.total} wordt toegevoegd`
            : pendingCount > 0
              ? `${pendingCount} foto('s) wachten op verbinding`
              : "Foto's toevoegen aan story"
        }
        className={`relative ${className ?? DEFAULT_CLASS}`}
      >
        {picker.busy ? (
          <Loader2 size={16} className="animate-spin" />
        ) : pendingCount > 0 ? (
          <UploadCloud size={16} className="text-amber-600 dark:text-amber-400" />
        ) : (
          <ImagePlus size={16} />
        )}
        {progress && progress.total > 1 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 font-mono text-[9px] font-bold text-paper">
            {progress.done}/{progress.total}
          </span>
        )}
        {!picker.busy && pendingCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 font-mono text-[9px] font-bold text-white">
            {pendingCount}
          </span>
        )}
      </button>
    </>
  );
}
