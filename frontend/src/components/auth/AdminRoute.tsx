import { Navigate, Outlet } from "react-router-dom";
import { routes } from "../../config/routes";
import { useAuthStore } from "../../store/auth.store";
import { useUser } from "../../hooks/useUsers";

export function AdminRoute() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { data: me, isPending } = useUser(currentUser ?? "");

  if (!currentUser) return <Navigate to={routes.login} replace />;
  // isPending, not isLoading: while the saved query cache is still being restored the query has not started
  // (isLoading is false), and reading that as "not an admin" sent a reload of /admin to the hub.
  if (isPending) return <div className="min-h-dvh bg-slate-950" />;
  if (!me?.is_admin) return <Navigate to={routes.hub} replace />;

  return <Outlet />;
}
