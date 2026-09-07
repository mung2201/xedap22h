import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { FullPageLoader } from '../components/common/full-page-loader';
import { useAuthStore } from '../stores/auth.store';
import { UserRole } from '../types/auth';

interface RoleRouteProps {
  allowedRoles: UserRole[];
  children: ReactNode;
  unauthenticatedRedirectTo?: string;
}

export const RoleRoute = ({
  allowedRoles,
  children,
  unauthenticatedRedirectTo = '/admin/login',
}: RoleRouteProps) => {
  const user = useAuthStore((state) => state.user);
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);

  if (isBootstrapping) {
    return <FullPageLoader />;
  }

  if (!user) {
    return <Navigate to={unauthenticatedRedirectTo} replace />;
  }

  return allowedRoles.includes(user.role) ? (
    <>{children}</>
  ) : (
    <Navigate to="/" replace />
  );
};
