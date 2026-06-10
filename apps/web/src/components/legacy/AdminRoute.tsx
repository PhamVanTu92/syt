import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/AuthContext";
import { isPathAllowed, getLandingPath } from "@/utils/permissionUtils";

const AdminRoute: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  const currentPath = location.pathname;
  const userPermissions = user.permissions || [];

  // Super admin: role=admin with no explicit permissions → bypass all permission checks
  const isSuperAdmin = userPermissions.length === 0;

  // 1. Handle the root admin path (/admin) by redirecting to dashboard
  if (currentPath === "/admin" || currentPath === "/admin/") {
    if (isSuperAdmin) return <Navigate to="/admin/dashboard" replace />;
    const landingPath = getLandingPath(user);
    return <Navigate to={landingPath} replace />;
  }

  // 2. Super admin can access all admin paths
  if (isSuperAdmin) return <Outlet />;

  // 3. Check if the specific sub-path is allowed
  if (!isPathAllowed(currentPath, user)) {
    const landingPath = getLandingPath(user);
    return <Navigate to={landingPath} replace />;
  }

  return <Outlet />;
};

export default AdminRoute;
