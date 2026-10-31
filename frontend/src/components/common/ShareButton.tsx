import { Share2 } from "lucide-react";

/** The one share button for every top bar, so it looks the same on every page. */
export function ShareButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Delen"
      aria-label="Delen"
      className="icon-btn"
    >
      <Share2 size={16} />
    </button>
  );
}
