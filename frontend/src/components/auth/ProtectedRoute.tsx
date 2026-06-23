import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../store/auth.store";

export function ProtectedRoute() {
  const { accessToken } = useAuthStore();

  // If there is no accessToken, send them to login. 
  // We don't need the 'checking' state anymore because Supabase 
  // handles session restoration silently in the background!
  return accessToken ? <Outlet /> : <Navigate to="/login" replace />;
}