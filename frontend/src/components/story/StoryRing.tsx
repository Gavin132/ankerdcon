import { Camera } from "lucide-react";

interface StoryRingProps {
  label: string;
  hasPhotos: boolean;
  hasUnseen: boolean;
  onClick: () => void;
}

/** Circular story-ring indicator — gradient border while there's an unseen
 * photo in that day's story, muted slate border once fully seen, dashed
 * when the day has no photos yet (still clickable, to add the first one). */
export function StoryRing({ label, hasPhotos, hasUnseen, onClick }: StoryRingProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 shrink-0 w-16"
    >
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-full p-[2.5px] ${
          hasPhotos
            ? hasUnseen
              ? "bg-gradient-to-tr from-amber-400 via-rose-500 to-violet-500"
              : "bg-slate-200 dark:bg-slate-700"
            : "border-2 border-dashed border-slate-300 dark:border-slate-600"
        }`}
      >
        <div className="flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-slate-900">
          <Camera
            size={18}
            className={hasPhotos ? "text-slate-500 dark:text-slate-400" : "text-slate-300 dark:text-slate-600"}
          />
        </div>
      </div>
      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate max-w-full">
        {label}
      </span>
    </button>
  );
}
