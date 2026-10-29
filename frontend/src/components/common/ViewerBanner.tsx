import { useEffect } from "react";
import { Eye } from "lucide-react";
import { useIsViewer } from "../../hooks/useIsViewer";
import { setViewerMode } from "../../lib/viewerMode";

/**
 * For a read-only member: a slim bar that says so, and the switch that makes the app stop sending
 * their changes (see lib/viewerMode.ts). Renders nothing for everyone else.
 */
export function ViewerBanner() {
  const viewer = useIsViewer();

  useEffect(() => {
    setViewerMode(viewer);
    return () => setViewerMode(false);
  }, [viewer]);

  if (!viewer) return null;

  return (
    <div className="sticky top-0 z-[100] border-b-1.5 border-outline bg-sunken text-ink" role="status">
      <div style={{ height: "env(safe-area-inset-top, 0px)" }} />
      <div className="flex items-center justify-center gap-2 px-4 py-1.5">
        <Eye size={14} className="shrink-0" />
        <span className="text-xs font-semibold">Je kunt alleen meekijken</span>
      </div>
    </div>
  );
}
