import { useEffect } from "react";
import { useBlocker } from "react-router-dom";

/**
 * Blocks in-app navigation (nav links, back/forward, browser back button) and
 * warns on tab close/refresh while `isDirty` is true. Render `UnsavedChangesModal`
 * with the returned blocker to let the user confirm or cancel leaving.
 */
export function useUnsavedChangesGuard(isDirty: boolean) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  return blocker;
}
