import type { ApiMeta } from './api';
import type { Permission, CurrentUser, UserRole, UserStatus } from './auth';
import type { OrderStatus, PaymentStatus } from './order';

export enum DashboardPeriod {
  LAST_7_DAYS = 'LAST_7_DAYS',
  LAST_30_DAYS = 'LAST_30_DAYS',
  THIS_MONTH = 'THIS_MONTH',
  THIS_YEAR = 'THIS_YEAR',
  CUSTOM = 'CUSTOM',
}

export interface DashboardQuery {
  period?: DashboardPeriod;
  startDate?: string;
  endDate?: string;
}

export interface DashboardStatistics {
  range: {
    period: DashboardPeriod;
    startDate: string;
    endDate: string;
  };
  summary: {
    totalRevenue: number;
    revenueToday: number;
    revenueThisMonth: number;
    rangeRevenue: number;
    rangeOrderCount: number;
    totalOrders: number;
    pendingOrders: number;
    shippingOrders: number;
    completedOrders: number;
    totalUsers: number;
    totalProducts: number;
    lowStockProducts: number;
    outOfStockProducts: number;
  };
  revenueByDay: Array<{ date: string; revenue: number; orders: number }>;
  revenueByMonth: Array<{ month: string; revenue: number; orders: number }>;
  ordersByStatus: Array<{ status: OrderStatus; count: number }>;
  topProducts: Array<{
    productId: string;
    name: string;
    image: string;
    soldQuantity: number;
    revenue: number;
  }>;
  topCategories: Array<{
    categoryId?: string;
    name: string;
    soldQuantity: number;
    revenue: number;
  }>;
  lowStockItems: Array<{
    productId: string;
    name: string;
    slug: string;
    thumbnail: string;
    availableStock: number;
  }>;
}

export interface AdminUserQuery {
  page?: number;
  limit?: number;
  keyword?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface AdminUserListResult {
  items: CurrentUser[];
  meta: ApiMeta;
}

export interface UpdateUserStatusPayload {
  status: UserStatus;
}

export interface UpdateUserRolePayload {
  role: UserRole;
}

export interface UpdateUserPermissionsPayload {
  permissions: Permission[];
}

export interface AdminOrderQuery {
  page?: number;
  limit?: number;
  keyword?: string;
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
  startDate?: string;
  endDate?: string;
}

export interface UpdateOrderStatusPayload {
  orderStatus: OrderStatus;
  note?: string;
}
