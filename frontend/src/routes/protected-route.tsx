import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { FullPageLoader } from '../components/common/full-page-loader';
import { useAuthStore } from '../stores/auth.store';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);

  if (isBootstrapping) {
    return <FullPageLoader />;
  }

  return isAuthenticated ? <>{children}</> : (
    <Navigate to="/login" state={{ from: location.pathname + location.search + location.hash }} replace />
  );
};
