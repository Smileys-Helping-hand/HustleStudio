import { Navigate, Outlet } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../context/AuthContext.jsx';
import { useTenant } from '../context/TenantContext.jsx';
import { hasRole } from '../lib/permissions.js';

const ProtectedRoute = ({ roles = null }) => {
  const { user, loading } = useAuth();
  const { activeMembership, loading: tenantLoading } = useTenant();

  if (loading || tenantLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--theme-background)] text-[var(--theme-text)]">
        <div className="animate-pulse rounded-lg border border-white/10 bg-white/5 px-6 py-4 text-lg">
          Loading your workspace...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !hasRole(activeMembership?.role, roles)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

ProtectedRoute.propTypes = {
  roles: PropTypes.arrayOf(PropTypes.string),
};

export default ProtectedRoute;
