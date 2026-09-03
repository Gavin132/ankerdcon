import { Home } from "lucide-react";
import { Link } from "react-router-dom";
import { routes } from "../../config/routes";

interface HomeLinkButtonProps {
  className: string;
  size?: number;
}

/**
 * Shown next to the back arrow on detail pages when there's no history to
 * go back to (see `isFreshEntry` in useSmartBack) — someone who opened a
 * shared link straight into the app has no in-app back button and no
 * browser back gesture that leads anywhere useful, so this is their only
 * reliable way to the main page.
 */
export function HomeLinkButton({ className, size = 16 }: HomeLinkButtonProps) {
  return (
    <Link to={routes.hub} aria-label="Naar hoofdpagina" className={className}>
      <Home size={size} />
    </Link>
  );
}
