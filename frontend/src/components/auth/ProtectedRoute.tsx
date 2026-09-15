import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/auth.store";
import { ForbiddenPage } from "../../pages/ForbiddenPage";
import { routes } from "../../config/routes";
import { useCurrentUser } from "../../hooks/useUsers";

export function ProtectedRoute() {
  const { accessToken, forbidden, initializing } = useAuthStore();
  const location = useLocation();

  const { data: me, isLoading: meLoading, isError: meError, refetch: retryMe } = useCurrentUser({
    enabled: !!accessToken && !forbidden && !initializing,
  });

  // Wait for Supabase session check and initial profile fetch
  if (initializing || (accessToken && !forbidden && meLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (forbidden) return <ForbiddenPage />;

  // The profile couldn't be loaded (backend down, 5xx). Don't render the app
  // underneath: its own current-user queries would refetch on mount, flip this
  // query back to loading, unmount the app again and loop forever.
  if (accessToken && meError && !me) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950 px-6 text-center">
        <p className="text-sm font-bold text-white">Kan de server niet bereiken</p>
        <p className="max-w-xs text-xs text-slate-400">
          Controleer je verbinding of probeer het zo nog eens.
        </p>
        <button
          type="button"
          onClick={() => retryMe()}
          className="mt-2 rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-white hover:bg-sky-600 transition-colors"
        >
          Opnieuw proberen
        </button>
      </div>
    );
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
