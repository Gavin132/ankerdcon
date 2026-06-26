import { Navigate, Outlet } from "react-router-dom";
import { routes } from "../../config/routes";
import { useAuthStore } from "../../store/auth.store";
import { useUser } from "../../hooks/useUsers";

export function AdminRoute() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { data: me, isLoading } = useUser(currentUser ?? "");

  if (!currentUser) return <Navigate to={routes.login} replace />;
  if (isLoading) return <div className="min-h-screen bg-slate-950" />;
  if (!me?.is_admin) return <Navigate to={routes.hub} replace />;

  return <Outlet />;
}
