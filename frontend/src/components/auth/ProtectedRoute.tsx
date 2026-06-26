import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/auth.store";
import { ForbiddenPage } from "../../pages/ForbiddenPage";
import { routes } from "../../config/routes";

export function ProtectedRoute() {
  const { accessToken, forbidden, initializing } = useAuthStore();
  const location = useLocation();

  // Wait for the Supabase session check to complete before making any routing decision
  if (initializing) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="h-8 w-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
    </div>
  );

  if (!accessToken) {
    // Preserve the page they were trying to reach so we can redirect back after login
    return <Navigate to={routes.login} state={{ from: location.pathname }} replace />;
  }

  if (forbidden) return <ForbiddenPage />;

  return <Outlet />;
}
