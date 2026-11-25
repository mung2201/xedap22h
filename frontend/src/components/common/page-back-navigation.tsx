import { ArrowLeftOutlined, HomeOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getAdminLandingPath } from '../../routes/admin-landing';
import { useAuthStore } from '../../stores/auth.store';
import '../../styles/page-back-navigation.css';

const parentPath = (pathname: string, adminLanding: string): string | null => {
  if (pathname === '/') return null;
  if (pathname === '/admin/login') return '/';
  if (/^\/admin\/(products|orders)\/.+/.test(pathname)) return pathname.split('/').slice(0, 3).join('/');
  if (pathname.startsWith('/admin')) return adminLanding === pathname ? '/' : adminLanding;
  if (pathname.startsWith('/products/')) return '/products';
  if (pathname === '/checkout') return '/cart';
  if (pathname === '/cart' || pathname === '/compare' || pathname === '/size-guide') return '/products';
  if (pathname.startsWith('/payment/') || pathname === '/order-success') return '/account/orders';
  if (pathname.startsWith('/account/orders/')) return '/account/orders';
  if (pathname.startsWith('/account/') && pathname !== '/account/profile') return '/account/profile';
  if (['/register', '/forgot-password', '/reset-password'].includes(pathname)) return '/login';
  return '/';
};

export const PageBackNavigation = ({ className = '' }: { className?: string }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const normalizedPath = pathname.replace(/\/$/, '') || '/';
  const fallback = parentPath(normalizedPath, user ? getAdminLandingPath(user) : '/');
  // Router indices count entries inside this app. history.length can include
  // other websites and must not be used to decide whether Back is safe.
  const historyIndex: unknown = window.history.state?.idx;
  const canGoBack = typeof historyIndex === 'number' && Number.isSafeInteger(historyIndex) && historyIndex > 0;

  return (
    <nav className={`page-back-navigation ${className}`} aria-label="Điều hướng trang">
      <Button
        className="page-back-button"
        icon={<ArrowLeftOutlined aria-hidden />}
        disabled={!canGoBack && !fallback}
        title={!canGoBack && !fallback ? 'Bạn đang ở trang đầu tiên' : undefined}
        onClick={() => {
          if (canGoBack) navigate(-1);
          else if (fallback) navigate(fallback, { replace: true });
        }}
      >
        Quay lại
      </Button>
      <Link to="/" replace={normalizedPath === '/'} className="page-home-button">
        <HomeOutlined aria-hidden />
        Về trang chủ
      </Link>
    </nav>
  );
};

/** Auth and not-found routes have no customer/account/admin layout. */
export const PageBackLayout = ({ children }: { children: ReactNode }) => (
  <div className="page-back-standalone">
    <PageBackNavigation className="page-container" />
    {children}
  </div>
);
