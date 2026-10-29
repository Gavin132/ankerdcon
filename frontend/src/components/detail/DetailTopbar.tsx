import { ArrowLeft } from "lucide-react";
import { HomeLinkButton } from "../common/HomeLinkButton";
import { ShareButton } from "../common/ShareButton";
import { TimeTravelControl } from "../common/TimeTravelWidget";
import { isFreshEntry } from "../../hooks/useSmartBack";

interface DetailTopbarProps {
  title: string;
  /** The page has its own big title (a hero): the bar names the kind of page ("Activiteit") and is no heading. */
  plainTitle?: boolean;
  onBack: () => void;
  onShare?: () => void;
  /** Extra icon buttons rendered between share and the home-link button —
   * e.g. the event page's story add/view actions. Compose with the same
   * h-8 w-8 rounded-xl icon-button styling used by the buttons here. */
  actions?: React.ReactNode;
  /** Match the page's content column so the bar lines up with it. */
  width?: "2xl" | "3xl";
}

const ICON_BUTTON =
  "icon-btn";

/** Flat surface bar on top of a detail page (these render outside the app shell). */
export function DetailTopbar({ title, plainTitle, onBack, onShare, actions, width = "3xl" }: DetailTopbarProps) {
  return (
    <header className="sticky top-0 z-10 border-b-1.5 border-line bg-surface pt-[env(safe-area-inset-top,0px)]">
      <div className={`mx-auto flex h-14 items-center gap-2 px-4 ${width === "2xl" ? "max-w-2xl" : "max-w-3xl"}`}>
        <button onClick={onBack} className={ICON_BUTTON} aria-label="Terug">
          <ArrowLeft size={16} />
        </button>
        {plainTitle ? (
          <p className="min-w-0 flex-1 truncate font-display text-[22px] font-extrabold uppercase leading-none tracking-[0.02em] text-ink">
            {title}
          </p>
        ) : (
          <h1 className="min-w-0 flex-1 truncate font-display text-[22px] font-extrabold uppercase leading-none tracking-[0.02em] text-ink">
            {title}
          </h1>
        )}
        {onShare && <ShareButton onClick={onShare} />}
        {actions}
        <TimeTravelControl variant="icon" />
        {isFreshEntry() && (
          <HomeLinkButton size={16} className={ICON_BUTTON} />
        )}
      </div>
    </header>
  );
}
