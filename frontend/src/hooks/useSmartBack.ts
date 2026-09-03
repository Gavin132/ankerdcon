import { useNavigate } from "react-router-dom";

/**
 * Like `navigate(-1)`, but falls back to a fixed path when there's no
 * earlier page in this browser session to go back to — e.g. someone who
 * opened a shared deep link (an event, ride, meal...) as the very first
 * page of their session. React Router stamps `history.state.idx` starting
 * at 0 for that first entry, incrementing on every subsequent in-app
 * navigation, so idx === 0 reliably means "nothing to go back to here".
 */
export function useSmartBack(fallback: string) {
  const navigate = useNavigate();
  return () => {
    if (isFreshEntry()) navigate(fallback, { replace: true });
    else navigate(-1);
  };
}

/**
 * True when this page is the first entry in the browser's session history —
 * i.e. there's nothing to go back to at all, not even for the browser's own
 * back button or an edge-swipe-back gesture (neither of which go through
 * `useSmartBack`, since they never call our code). Detail pages use this to
 * show an explicit Home affordance instead of relying only on the in-app
 * back arrow.
 */
export function isFreshEntry(): boolean {
  return ((window.history.state as { idx?: number } | null)?.idx ?? 0) === 0;
}
