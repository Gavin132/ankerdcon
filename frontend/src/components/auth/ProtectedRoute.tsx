import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../store/auth.store";
import { refresh } from "../../services/auth.service";
import { LoadingSpinner } from "../common/LoadingSpinner";

export function ProtectedRoute() {
  const { isAuthenticated, setAccessToken } = useAuthStore();
  const [checking, setChecking] = useState(!isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) return;
    refresh()
      .then((data) => setAccessToken(data.access_token))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [isAuthenticated, setAccessToken]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ankerd-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
