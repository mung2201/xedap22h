import { lazy, Suspense } from 'react';
import type { ComponentType } from 'react';
import { Spin } from 'antd';
import { Navigate, createBrowserRouter } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import { PageBackLayout } from '../components/common/page-back-navigation';
import { CustomerLayout } from '../layouts/customer-layout';
import { GuestRoute } from '../routes/guest-route';
import { ProtectedRoute } from '../routes/protected-route';
import { RoleRoute } from '../routes/role-route';
import { Permission, UserRole } from '../types/auth';
import { PermissionRoute } from '../routes/permission-route';
import { AdminIndexRedirect } from '../routes/admin-index-redirect';
import { RouteErrorPage } from '../pages/route-error-page';

// Keep the surrounding layout and access guards mounted while a page loads.
const lazyPage = (load: () => Promise<{ default: ComponentType }>) => {
  const Page = lazy(load);
  return function LazyRoutePage() {
    return (
      <Suspense fallback={<div className="route-page-loading" role="status" aria-live="polite"><Spin /><span>Đang tải trang…</span></div>}>
        <Page />
      </Suspense>
    );
  };
};

const AccountLayout = lazyPage(() => import('../layouts/account-layout').then((module) => ({ default: module.AccountLayout })));
const AdminLayout = lazyPage(() => import('../layouts/admin-layout').then((module) => ({ default: module.AdminLayout })));
const LoginPage = lazyPage(() => import('../pages/auth/login-page').then((module) => ({ default: module.LoginPage })));
const AdminLoginPage = lazyPage(() => import('../pages/auth/login-page').then((module) => ({ default: () => <module.LoginPage adminOnly /> })));
const ProfilePage = lazyPage(() => import('../pages/account/profile-page').then((module) => ({ default: module.ProfilePage })));
const ChangePasswordPage = lazyPage(() => import('../pages/account/change-password-page').then((module) => ({ default: module.ChangePasswordPage })));
const AddressBookPage = lazyPage(() => import('../pages/account/address-book-page').then((module) => ({ default: module.AddressBookPage })));
const WishlistPage = lazyPage(() => import('../pages/account/wishlist-page').then((module) => ({ default: module.WishlistPage })));
const OrderDetailPage = lazyPage(() => import('../pages/account/order-detail-page').then((module) => ({ default: module.OrderDetailPage })));
const OrdersPage = lazyPage(() => import('../pages/account/orders-page').then((module) => ({ default: module.OrdersPage })));
const ProductQuestionsPage = lazyPage(() => import('../pages/account/product-questions-page').then((module) => ({ default: module.ProductQuestionsPage })));
const AdminDashboardPage = lazyPage(() => import('../pages/admin/admin-dashboard-page').then((module) => ({ default: module.AdminDashboardPage })));
const AdminBrandsPage = lazyPage(() => import('../pages/admin/admin-brands-page').then((module) => ({ default: module.AdminBrandsPage })));
const AdminCategoriesPage = lazyPage(() => import('../pages/admin/admin-categories-page').then((module) => ({ default: module.AdminCategoriesPage })));
const AdminBannersPage = lazyPage(() => import('../pages/admin/admin-banners-page').then((module) => ({ default: module.AdminBannersPage })));
const AdminOrderDetailPage = lazyPage(() => import('../pages/admin/admin-order-detail-page').then((module) => ({ default: module.AdminOrderDetailPage })));
const AdminOrdersPage = lazyPage(() => import('../pages/admin/admin-orders-page').then((module) => ({ default: module.AdminOrdersPage })));
const AdminProductFormPage = lazyPage(() => import('../pages/admin/admin-product-form-page').then((module) => ({ default: module.AdminProductFormPage })));
const AdminProductsPage = lazyPage(() => import('../pages/admin/admin-products-page').then((module) => ({ default: module.AdminProductsPage })));
const AdminPagesPage = lazyPage(() => import('../pages/admin/admin-pages-page').then((module) => ({ default: module.AdminPagesPage })));
const AdminUsersPage = lazyPage(() => import('../pages/admin/admin-users-page').then((module) => ({ default: module.AdminUsersPage })));
const AdminVouchersPage = lazyPage(() => import('../pages/admin/admin-vouchers-page').then((module) => ({ default: module.AdminVouchersPage })));
const ForgotPasswordPage = lazyPage(() => import('../pages/auth/forgot-password-page').then((module) => ({ default: module.ForgotPasswordPage })));
const RegisterPage = lazyPage(() => import('../pages/auth/register-page').then((module) => ({ default: module.RegisterPage })));
const ResetPasswordPage = lazyPage(() => import('../pages/auth/reset-password-page').then((module) => ({ default: module.ResetPasswordPage })));
const HomePage = lazyPage(() => import('../pages/home-page').then((module) => ({ default: module.HomePage })));
const CartPage = lazyPage(() => import('../pages/cart/cart-page').then((module) => ({ default: module.CartPage })));
const CheckoutPage = lazyPage(() => import('../pages/checkout/checkout-page').then((module) => ({ default: module.CheckoutPage })));
const MockPaymentPage = lazyPage(() => import('../pages/orders/mock-payment-page').then((module) => ({ default: module.MockPaymentPage })));
const NotFoundPage = lazyPage(() => import('../pages/not-found-page').then((module) => ({ default: module.NotFoundPage })));
const OrderSuccessPage = lazyPage(() => import('../pages/orders/order-success-page').then((module) => ({ default: module.OrderSuccessPage })));
const OrderTrackingPage = lazyPage(() => import('../pages/order-tracking-page').then((module) => ({ default: module.OrderTrackingPage })));
const ProductDetailPage = lazyPage(() => import('../pages/products/product-detail-page').then((module) => ({ default: module.ProductDetailPage })));
const ProductsPage = lazyPage(() => import('../pages/products/products-page').then((module) => ({ default: module.ProductsPage })));
const CompareProductsPage = lazyPage(() => import('../pages/products/compare-products-page').then((module) => ({ default: module.CompareProductsPage })));
const StaticPagePage = lazyPage(() => import('../pages/static-page-page').then((module) => ({ default: module.StaticPagePage })));
const SizeGuidePage = lazyPage(() => import('../pages/size-guide-page').then((module) => ({ default: module.SizeGuidePage })));
const ServiceBookingPage = lazyPage(() => import('../pages/service-booking-page').then((module) => ({ default: module.ServiceBookingPage })));
const AdminSizeGuidesPage = lazyPage(() => import('../pages/admin/admin-size-guides-page').then((module) => ({ default: module.AdminSizeGuidesPage })));
const AdminFaqsPage = lazyPage(() => import('../pages/admin/admin-faqs-page').then((module) => ({ default: module.AdminFaqsPage })));
const AdminServiceBookingsPage = lazyPage(() => import('../pages/admin/admin-service-bookings-page').then((module) => ({ default: module.AdminServiceBookingsPage })));
const AdminProductQuestionsPage = lazyPage(() => import('../pages/admin/admin-product-questions-page').then((module) => ({ default: module.AdminProductQuestionsPage })));

const routes: RouteObject[] = [
  {
    path: '/',
    element: <CustomerLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'products', element: <ProductsPage /> },
      { path: 'products/:slug', element: <ProductDetailPage /> },
      { path: 'compare', element: <CompareProductsPage /> },
      { path: 'size-guide', element: <SizeGuidePage /> },
      { path: 'track-order', element: <OrderTrackingPage /> },
      {
        path: 'service-booking',
        element: (
          <RoleRoute
            allowedRoles={[UserRole.CUSTOMER]}
            unauthenticatedRedirectTo="/login"
          >
            <ServiceBookingPage />
          </RoleRoute>
        ),
      },
      { path: 'pages/:slug', element: <StaticPagePage /> },
      {
        path: 'cart',
        element: (
          <ProtectedRoute>
            <CartPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'checkout',
        element: (
          <ProtectedRoute>
            <CheckoutPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'order-success',
        element: (
          <ProtectedRoute>
            <OrderSuccessPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'payment/qr',
        element: (
          <ProtectedRoute>
            <MockPaymentPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'payment/mock',
        element: (
          <ProtectedRoute>
            <MockPaymentPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: '/login',
    element: (
      <GuestRoute>
        <LoginPage />
      </GuestRoute>
    ),
  },
  {
    path: '/register',
    element: (
      <GuestRoute>
        <RegisterPage />
      </GuestRoute>
    ),
  },
  {
    path: '/forgot-password',
    element: (
      <GuestRoute>
        <ForgotPasswordPage />
      </GuestRoute>
    ),
  },
  {
    path: '/reset-password',
    element: (
      <GuestRoute>
        <ResetPasswordPage />
      </GuestRoute>
    ),
  },
  {
    path: '/account',
    element: (
      <ProtectedRoute>
        <AccountLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="profile" replace /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'addresses', element: <AddressBookPage /> },
      { path: 'wishlist', element: <WishlistPage /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'orders/:id', element: <OrderDetailPage /> },
      {
        path: 'questions',
        element: (
          <RoleRoute
            allowedRoles={[UserRole.CUSTOMER]}
            unauthenticatedRedirectTo="/login"
          >
            <ProductQuestionsPage />
          </RoleRoute>
        ),
      },
      { path: 'change-password', element: <ChangePasswordPage /> },
    ],
  },
  {
    path: '/admin/login',
    element: (
      <GuestRoute>
        <AdminLoginPage />
      </GuestRoute>
    ),
  },
  {
    path: '/admin',
    element: (
      <RoleRoute allowedRoles={[UserRole.ADMIN, UserRole.STAFF]}>
        <AdminLayout />
      </RoleRoute>
    ),
    children: [
      { index: true, element: <AdminIndexRedirect /> },
      {
        path: 'dashboard',
        element: (
          <PermissionRoute
            anyOf={[Permission.VIEW_DASHBOARD, Permission.VIEW_STATISTICS]}
          >
            <AdminDashboardPage />
          </PermissionRoute>
        ),
      },
      {
        path: 'products',
        element: (
          <PermissionRoute permission={Permission.MANAGE_PRODUCTS}>
            <AdminProductsPage />
          </PermissionRoute>
        ),
      },
      {
        path: 'products/create',
        element: (
          <PermissionRoute permission={Permission.MANAGE_PRODUCTS}>
            <AdminProductFormPage />
          </PermissionRoute>
        ),
      },
      {
        path: 'products/:id/edit',
        element: (
          <PermissionRoute permission={Permission.MANAGE_PRODUCTS}>
            <AdminProductFormPage />
          </PermissionRoute>
        ),
      },
      {
        path: 'product-questions',
        element: (
          <PermissionRoute permission={Permission.MANAGE_PRODUCTS}>
            <AdminProductQuestionsPage />
          </PermissionRoute>
        ),
      },
      {
        path: 'categories',
        element: (
          <PermissionRoute permission={Permission.MANAGE_CATEGORIES}>
            <AdminCategoriesPage />
          </PermissionRoute>
        ),
      },
      {
        path: 'brands',
        element: (
          <PermissionRoute permission={Permission.MANAGE_CATEGORIES}>
            <AdminBrandsPage />
          </PermissionRoute>
        ),
      },
      {
        path: 'orders',
        element: (
          <PermissionRoute permission={Permission.MANAGE_ORDERS}>
            <AdminOrdersPage />
          </PermissionRoute>
        ),
      },
      {
        path: 'orders/:id',
        element: (
          <PermissionRoute permission={Permission.MANAGE_ORDERS}>
            <AdminOrderDetailPage />
          </PermissionRoute>
        ),
      },
      {
        path: 'users',
        element: (
          <PermissionRoute permission={Permission.MANAGE_USERS}>
            <AdminUsersPage />
          </PermissionRoute>
        ),
      },
      {
        path: 'vouchers',
        element: (
          <PermissionRoute permission={Permission.MANAGE_VOUCHERS}>
            <AdminVouchersPage />
          </PermissionRoute>
        ),
      },
      {
        path: 'banners',
        element: (
          <PermissionRoute permission={Permission.MANAGE_CMS}>
            <AdminBannersPage />
          </PermissionRoute>
        ),
      },
      {
        path: 'pages',
        element: (
          <PermissionRoute permission={Permission.MANAGE_CMS}>
            <AdminPagesPage />
          </PermissionRoute>
        ),
      },
      {
        path: 'size-guides',
        element: (
          <PermissionRoute permission={Permission.MANAGE_CMS}>
            <AdminSizeGuidesPage />
          </PermissionRoute>
        ),
      },
      {
        path: 'chatbot/faqs',
        element: (
          <PermissionRoute permission={Permission.MANAGE_CHATBOT}>
            <AdminFaqsPage />
          </PermissionRoute>
        ),
      },
      {
        path: 'service-bookings',
        element: (
          <PermissionRoute permission={Permission.MANAGE_SERVICE_BOOKINGS}>
            <AdminServiceBookingsPage />
          </PermissionRoute>
        ),
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
];

export const router = createBrowserRouter(routes.map((route) => {
  // These layouts own their Back button; all independent pages share a wrapper.
  const hasLayout = route.path && ['/', '/account', '/admin'].includes(route.path);
  return {
    ...route,
    element: hasLayout ? route.element : <PageBackLayout>{route.element}</PageBackLayout>,
    errorElement: <RouteErrorPage />,
  };
}));
