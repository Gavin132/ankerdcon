import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../store/auth.store";
import { ForbiddenPage } from "../../pages/ForbiddenPage";
import { routes } from "../../config/routes";

export function ProtectedRoute() {
  const { accessToken, forbidden } = useAuthStore();

  if (!accessToken) return <Navigate to={routes.login} replace />;
  if (forbidden) return <ForbiddenPage />;
  return <Outlet />;
}