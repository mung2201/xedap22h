import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AccountLayout } from '../layouts/account-layout';
import { AdminLayout } from '../layouts/admin-layout';
import { CustomerLayout } from '../layouts/customer-layout';
import { ProfilePage } from '../pages/account/profile-page';
import { ChangePasswordPage } from '../pages/account/change-password-page';
import { AddressBookPage } from '../pages/account/address-book-page';
import { WishlistPage } from '../pages/account/wishlist-page';
import { OrderDetailPage } from '../pages/account/order-detail-page';
import { OrdersPage } from '../pages/account/orders-page';
import { ProductQuestionsPage } from '../pages/account/product-questions-page';
import { AdminDashboardPage } from '../pages/admin/admin-dashboard-page';
import { AdminBrandsPage } from '../pages/admin/admin-brands-page';
import { AdminCategoriesPage } from '../pages/admin/admin-categories-page';
import { AdminBannersPage } from '../pages/admin/admin-banners-page';
import { AdminOrderDetailPage } from '../pages/admin/admin-order-detail-page';
import { AdminOrdersPage } from '../pages/admin/admin-orders-page';
import { AdminProductFormPage } from '../pages/admin/admin-product-form-page';
import { AdminProductsPage } from '../pages/admin/admin-products-page';
import { AdminPagesPage } from '../pages/admin/admin-pages-page';
import { AdminUsersPage } from '../pages/admin/admin-users-page';
import { AdminVouchersPage } from '../pages/admin/admin-vouchers-page';
import { ForgotPasswordPage } from '../pages/auth/forgot-password-page';
import { LoginPage } from '../pages/auth/login-page';
import { RegisterPage } from '../pages/auth/register-page';
import { ResetPasswordPage } from '../pages/auth/reset-password-page';
import { HomePage } from '../pages/home-page';
import { CartPage } from '../pages/cart/cart-page';
import { CheckoutPage } from '../pages/checkout/checkout-page';
import { MockPaymentPage } from '../pages/orders/mock-payment-page';
import { NotFoundPage } from '../pages/not-found-page';
import { OrderSuccessPage } from '../pages/orders/order-success-page';
import { OrderTrackingPage } from '../pages/order-tracking-page';
import { ProductDetailPage } from '../pages/products/product-detail-page';
import { ProductsPage } from '../pages/products/products-page';
import { CompareProductsPage } from '../pages/products/compare-products-page';
import { StaticPagePage } from '../pages/static-page-page';
import { SizeGuidePage } from '../pages/size-guide-page';
import { ServiceBookingPage } from '../pages/service-booking-page';
import { AdminSizeGuidesPage } from '../pages/admin/admin-size-guides-page';
import { AdminFaqsPage } from '../pages/admin/admin-faqs-page';
import { AdminServiceBookingsPage } from '../pages/admin/admin-service-bookings-page';
import { AdminProductQuestionsPage } from '../pages/admin/admin-product-questions-page';
import { GuestRoute } from '../routes/guest-route';
import { ProtectedRoute } from '../routes/protected-route';
import { RoleRoute } from '../routes/role-route';
import { Permission, UserRole } from '../types/auth';
import { PermissionRoute } from '../routes/permission-route';
import { AdminIndexRedirect } from '../routes/admin-index-redirect';

export const router = createBrowserRouter([
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
        <LoginPage adminOnly />
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
]);
