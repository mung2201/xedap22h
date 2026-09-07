import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { FullPageLoader } from '../components/common/full-page-loader';
import { useAuthStore } from '../stores/auth.store';
import { UserRole } from '../types/auth';
import { getAdminLandingPath } from './admin-landing';

interface GuestRouteProps {
  children: ReactNode;
}

export const GuestRoute = ({ children }: GuestRouteProps) => {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);
  const location = useLocation();

  if (isBootstrapping) {
    return <FullPageLoader />;
  }

  if (!isAuthenticated || !user) {
    return <>{children}</>;
  }

  const isAdminLogin = location.pathname.startsWith('/admin');
  const target =
    isAdminLogin && [UserRole.ADMIN, UserRole.STAFF].includes(user.role)
      ? getAdminLandingPath(user)
      : '/';

  return <Navigate to={target} replace />;
};
