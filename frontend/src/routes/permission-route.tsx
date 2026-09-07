import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { FullPageLoader } from '../components/common/full-page-loader';
import { useAuthStore } from '../stores/auth.store';
import { Permission, UserRole } from '../types/auth';
import { getAdminLandingPath } from './admin-landing';

interface PermissionRouteProps {
  permission?: Permission;
  anyOf?: Permission[];
  children: ReactNode;
}

export const PermissionRoute = ({
  permission,
  anyOf,
  children,
}: PermissionRouteProps) => {
  const user = useAuthStore((state) => state.user);
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);

  if (isBootstrapping) {
    return <FullPageLoader />;
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  const hasPermission = user.role === UserRole.ADMIN || (
    anyOf?.length
      ? anyOf.some((candidate) => user.permissions.includes(candidate))
      : permission !== undefined && user.permissions.includes(permission)
  );

  if (hasPermission) {
    return <>{children}</>;
  }

  return <Navigate to={getAdminLandingPath(user)} replace />;
};
