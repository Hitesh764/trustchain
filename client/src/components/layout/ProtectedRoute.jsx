import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

// Usage: <Route element={<ProtectedRoute allowedRole="manufacturer" />}>...</Route>
export default function ProtectedRoute({ allowedRole }) {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to={allowedRole === "admin" ? "/admin/login" : "/login"} replace />;
  }

  if (role !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
