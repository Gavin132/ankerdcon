import { useEffect, useState } from "react";
import { useRouteError } from "react-router-dom";
import { ErrorFallback } from "./ErrorBoundary";
import { attemptAutoReload } from "../../utils/errorRecovery";

/**
 * `errorElement` for the router root. React Router's data router catches
 * render errors from route elements itself, before they'd ever reach a
 * class-component `ErrorBoundary` wrapping `RouterProvider` — so that outer
 * boundary alone never actually saw a crashing page. This is the real catch
 * point for anything thrown inside a route.
 */
export function RouteErrorFallback() {
  const error = useRouteError();
  const [giveUp, setGiveUp] = useState(false);

  useEffect(() => {
    console.error("Uncaught route error:", error);
    if (!attemptAutoReload()) setGiveUp(true);
    // Only ever run once per mount — re-running on `error` identity changes
    // would re-trigger the reload check for what's still the same crash.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (giveUp) return <ErrorFallback />;
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="h-8 w-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
    </div>
  );
}
