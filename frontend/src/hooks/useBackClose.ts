import { useEffect, useRef } from "react";
import { openBackEntry } from "../utils/backStack";

/**
 * Lets the phone's back gesture close an overlay (a lightbox, the story viewer, a dialog) instead of leaving the
 * page or the app. `onClose` must close it; it is read when the gesture happens, so it may change while open.
 * Sheets (TripSheet) use `openBackEntry` directly: they need to know whether the entry exists.
 */
export function useBackClose(open: boolean, onClose: () => void): void {
  const latest = useRef(onClose);
  latest.current = onClose;
  useEffect(() => {
    if (!open) return;
    return openBackEntry(() => latest.current());
  }, [open]);
}
