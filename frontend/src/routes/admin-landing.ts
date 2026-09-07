import { Permission, type CurrentUser, UserRole } from '../types/auth';

const staffLandingRoutes: Array<{ permission: Permission; path: string }> = [
  { permission: Permission.VIEW_DASHBOARD, path: '/admin/dashboard' },
  { permission: Permission.VIEW_STATISTICS, path: '/admin/dashboard' },
  { permission: Permission.MANAGE_ORDERS, path: '/admin/orders' },
  { permission: Permission.MANAGE_PRODUCTS, path: '/admin/products' },
  { permission: Permission.MANAGE_CATEGORIES, path: '/admin/categories' },
  { permission: Permission.MANAGE_USERS, path: '/admin/users' },
  { permission: Permission.MANAGE_VOUCHERS, path: '/admin/vouchers' },
  { permission: Permission.MANAGE_CMS, path: '/admin/banners' },
  { permission: Permission.MANAGE_CHATBOT, path: '/admin/chatbot/faqs' },
];

export const getAdminLandingPath = (user: CurrentUser): string => {
  if (user.role === UserRole.ADMIN) {
    return '/admin/dashboard';
  }

  return (
    staffLandingRoutes.find((route) => user.permissions.includes(route.permission))
      ?.path ?? '/'
  );
};
