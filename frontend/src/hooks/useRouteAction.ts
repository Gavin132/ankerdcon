import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/** What a navigation can ask the page it lands on to do (see `RouteActionState`). */
export type RouteAction = "ping" | "parking" | "addMeal";

export interface RouteActionState {
  action: RouteAction;
}

/**
 * Lets a link say "go to this page and open that" — the global search's action
 * cards use it, e.g. "Locatie pingen" lands on Crew with the ping sheet open.
 * It rides on `location.state`, so it is one-shot and never a URL anyone else
 * could be sent: the state is cleared once `run` has been called, so a reload
 * or going back doesn't open it again.
 *
 * Runs once per navigation (keyed on `location.key`), including when the page
 * is already open and nothing remounts.
 */
export function useRouteAction(action: RouteAction, run: () => void) {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if ((location.state as Partial<RouteActionState> | null)?.action !== action) return;
    run();
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    // Only a new navigation should trigger it, not a new `run` closure every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);
}
