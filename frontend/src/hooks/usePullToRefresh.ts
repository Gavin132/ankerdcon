import { useCallback, useEffect, useRef, useState } from "react";

const THRESHOLD  = 68;   // px before triggering
const MAX_PULL   = 96;   // px maximum visual drag
const RESISTANCE = 0.44; // dampens the pull (rubber-band feel)

export interface PullToRefreshState {
  pullDistance: number;
  isRefreshing: boolean;
}

export function usePullToRefresh(
  onRefresh: () => Promise<void> | void,
): PullToRefreshState {
  const [pullDistance, setPullDistance]   = useState(0);
  const [isRefreshing, setIsRefreshing]   = useState(false);

  const startYRef       = useRef<number | null>(null);
  const pullingRef      = useRef(false);
  const refreshingRef   = useRef(false);
  const pullDistRef     = useRef(0); // mirrors state, readable in callbacks
  const onRefreshRef    = useRef(onRefresh);

  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY > 0 || refreshingRef.current) return;
    startYRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (startYRef.current === null || refreshingRef.current) return;
    if (window.scrollY > 0) { startYRef.current = null; return; }

    const delta = e.touches[0].clientY - startYRef.current;
    if (delta > 0) {
      pullingRef.current = true;
      const d = Math.min(delta * RESISTANCE, MAX_PULL);
      pullDistRef.current = d;
      setPullDistance(d);
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!pullingRef.current) return;
    pullingRef.current = false;

    const captured = pullDistRef.current;
    pullDistRef.current = 0;

    if (captured >= THRESHOLD) {
      refreshingRef.current = true;
      setIsRefreshing(true);
      setPullDistance(0);
      try {
        await onRefreshRef.current();
      } finally {
        refreshingRef.current = false;
        setIsRefreshing(false);
      }
    } else {
      setPullDistance(0);
    }
    startYRef.current = null;
  }, []);

  useEffect(() => {
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove",  handleTouchMove,  { passive: true });
    document.addEventListener("touchend",   handleTouchEnd);
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove",  handleTouchMove);
      document.removeEventListener("touchend",   handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { pullDistance, isRefreshing };
}
