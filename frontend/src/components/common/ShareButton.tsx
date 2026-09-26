import { Share2 } from "lucide-react";

/** The one share button for every top bar, so it looks the same on every page. */
export function ShareButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Delen"
      aria-label="Delen"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
    >
      <Share2 size={17} />
    </button>
  );
}
