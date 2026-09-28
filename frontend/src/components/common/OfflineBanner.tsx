import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * The device has no network at all — not "the API is slow or down" (that's
 * ServerUnreachable and the 503-retry handling elsewhere), just "there is
 * nothing to even try a request over". Sticks around for as long as that's
 * true rather than fading on a timer: bad reception in a convention hall can
 * last a while, and the point is to say so for exactly as long as it's real.
 * Disappears the instant the connection is back, with nothing further to say.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && navigator.onLine === false);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="sticky top-0 z-[100] border-b-1.5 border-outline bg-amber-400 text-slate-900">
      {/* Safe-area spacer — kept separate from the content row so the row
          itself always stays vertically centered regardless of notch height,
          same pattern as ImpersonationBanner. */}
      <div style={{ height: "env(safe-area-inset-top, 0px)" }} />
      <div className="flex items-center justify-center gap-2 px-4 py-2">
        <WifiOff size={14} className="shrink-0" />
        <span className="text-xs font-bold">Geen internetverbinding — dit werkt weer zodra je terug online bent</span>
      </div>
    </div>
  );
}
