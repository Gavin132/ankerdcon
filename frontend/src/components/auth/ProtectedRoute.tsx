import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/auth.store";
import { ForbiddenPage } from "../../pages/ForbiddenPage";
import { routes } from "../../config/routes";

export function ProtectedRoute() {
  const { accessToken, forbidden, initializing } = useAuthStore();
  const location = useLocation();

  // Wait for the Supabase session check to complete before making any routing decision
  if (initializing) return <div className="min-h-screen bg-slate-950" />;

  if (!accessToken) {
    // Preserve the page they were trying to reach so we can redirect back after login
    return <Navigate to={routes.login} state={{ from: location.pathname }} replace />;
  }

  if (forbidden) return <ForbiddenPage />;

  return <Outlet />;
}
