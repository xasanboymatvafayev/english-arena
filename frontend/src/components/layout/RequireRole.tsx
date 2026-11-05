import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, type Role } from "@/contexts/AuthContext";
import { PageLoading } from "@/components/ui/States";

export function RequireRole({ role }: { role: Role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== role) {
    return <Navigate to={user.role === "teacher" ? "/teacher" : "/student"} replace />;
  }
  return <Outlet />;
}
