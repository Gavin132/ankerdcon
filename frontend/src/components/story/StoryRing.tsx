import { Camera } from "lucide-react";

interface StoryRingProps {
  label: string;
  hasPhotos: boolean;
  hasUnseen: boolean;
  /** The most recent photo in that day's story — shown as the ring's
   * thumbnail when present, same as a real Instagram/Polarsteps story ring. */
  previewUrl?: string;
  onClick: () => void;
}

/** Circular story-ring indicator — brand-blue ring with an ink outline while
 * there's an unseen photo in that day's story, a grey line once fully seen,
 * a plain empty circle when the day has no photos yet (still clickable, to
 * add the first one). Only the "add" tile is dashed. */
export function StoryRing({ label, hasPhotos, hasUnseen, previewUrl, onClick }: StoryRingProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 shrink-0 w-16"
    >
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-full ${
          hasPhotos
            ? hasUnseen
              ? "bg-brand p-[3px] shadow-[inset_0_0_0_1.5px_rgb(var(--outline))]"
              : "bg-line p-[2px]"
            : "border-1.5 border-line p-[2px]"
        }`}
      >
        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-surface">
          {previewUrl ? (
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          ) : hasPhotos ? (
            <Camera size={16} className="text-ink-2" />
          ) : null}
        </div>
      </div>
      <span className="max-w-full truncate text-[12px] font-semibold capitalize text-ink-2">
        {label}
      </span>
    </button>
  );
}
