import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/auth.store";
import { ForbiddenPage } from "../../pages/ForbiddenPage";
import { routes } from "../../config/routes";
import { useCurrentUser } from "../../hooks/useUsers";
import { ServerUnreachable } from "../common/ServerUnreachable";
import { StatusLink } from "../common/StatusLink";
import { LoadingSpinner } from "../common/LoadingSpinner";

/** After this long on the loading screen, say so instead of leaving a spinner that looks stuck. */
const SLOW_AFTER_MS = 6000;

function LoadingScreen() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-hero px-6 text-center">
      <LoadingSpinner onDark />
      {slow && (
        <div className="flex max-w-[280px] flex-col items-center gap-3" role="status">
          <p className="text-sm leading-relaxed text-hero-ink/75">De server reageert traag. Even geduld, het kan zijn dat hij net opstart.</p>
          <StatusLink />
        </div>
      )}
    </div>
  );
}

export function ProtectedRoute() {
  const { accessToken, forbidden, initializing } = useAuthStore();
  const location = useLocation();

  const { data: me, isLoading: meLoading, isError: meError, refetch: retryMe } = useCurrentUser({
    enabled: !!accessToken && !forbidden && !initializing,
  });

  // Wait for Supabase session check and initial profile fetch
  if (initializing || (accessToken && !forbidden && meLoading)) {
    return <LoadingScreen />;
  }

  if (forbidden) return <ForbiddenPage />;

  // The profile couldn't be loaded (backend down, 5xx). Don't render the app
  // underneath: its own current-user queries would refetch on mount, flip this
  // query back to loading, unmount the app again and loop forever.
  if (accessToken && meError && !me) {
    return <ServerUnreachable onRetry={() => retryMe()} />;
  }

  if (!accessToken) {
    return <Navigate to={routes.login} state={{ from: location.pathname }} replace />;
  }

  // Redirect to onboarding if user hasn't completed it yet.
  // Strict equality guards against undefined (migration not yet applied).
  if (me && me.onboarding_completed === false && location.pathname !== routes.onboarding) {
    return <Navigate to={routes.onboarding} replace />;
  }

  return <Outlet />;
}
