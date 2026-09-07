import { Navigate } from 'react-router-dom';
import { FullPageLoader } from '../components/common/full-page-loader';
import { useAuthStore } from '../stores/auth.store';
import { getAdminLandingPath } from './admin-landing';

export const AdminIndexRedirect = () => {
  const user = useAuthStore((state) => state.user);
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);

  if (isBootstrapping) {
    return <FullPageLoader />;
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Navigate to={getAdminLandingPath(user)} replace />;
};
