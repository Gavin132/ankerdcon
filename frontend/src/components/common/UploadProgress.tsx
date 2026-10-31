import { overallProgress, useUploadProgressStore } from "../../store/uploadProgress.store";

/** Uploads under this size are over before a bar would be read (an avatar, a banner crop). */
const MIN_BYTES = 150_000;

/**
 * How far the upload that is running is, once for the whole app: a thin bar across the top and a label. At 100 % the file
 * has arrived and the server is still storing it, which is a wait of its own, so it says so instead of looking stuck.
 */
export function UploadProgress() {
  const active = useUploadProgressStore((s) => s.active);
  const big = Object.fromEntries(Object.entries(active).filter(([, u]) => u.total >= MIN_BYTES));
  const percent = overallProgress(big);
  if (percent === null) return null;
  const label = percent >= 100 ? "Verwerken…" : `Uploaden… ${percent}%`;

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-0 z-[90]">
      <div className="h-1 bg-sunken">
        <div className="h-full bg-brand transition-[width] duration-200" style={{ width: `${percent}%` }} />
      </div>
      <p className="mx-auto mt-2 w-fit rounded-full border-1.5 border-line bg-surface px-3 py-1 text-[12.5px] font-semibold text-ink">{label}</p>
    </div>
  );
}
