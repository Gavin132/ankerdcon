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
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  };
}
