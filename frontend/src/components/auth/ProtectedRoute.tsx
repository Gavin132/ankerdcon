import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/auth.store";
import { ForbiddenPage } from "../../pages/ForbiddenPage";
import { routes } from "../../config/routes";
import { useCurrentUser } from "../../hooks/useUsers";

export function ProtectedRoute() {
  const { accessToken, forbidden, initializing } = useAuthStore();
  const location = useLocation();

  const { data: me, isLoading: meLoading } = useCurrentUser({
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
