import { apiClient } from '../axios.client';
import type { ApiResponse } from '../../types/api';
import type { Order, OrderListResult } from '../../types/order';
import type { AdminOrderQuery, UpdateOrderStatusPayload } from '../../types/admin';

const toOrderListResult = (response: ApiResponse<Order[]>): OrderListResult => ({
  items: response.data,
  meta:
    response.meta ?? {
      page: 1,
      limit: response.data.length,
      total: response.data.length,
      totalPages: 1,
    },
});

export const adminOrderService = {
  async getList(query: AdminOrderQuery = {}): Promise<OrderListResult> {
    const response = await apiClient.get<ApiResponse<Order[]>>('/admin/orders', {
      params: query,
    });
    return toOrderListResult(response.data);
  },

  async getById(orderId: string): Promise<Order> {
    const response = await apiClient.get<ApiResponse<Order>>(`/admin/orders/${orderId}`);
    return response.data.data;
  },

  async updateStatus(
    orderId: string,
    payload: UpdateOrderStatusPayload,
  ): Promise<Order> {
    const response = await apiClient.patch<ApiResponse<Order>>(
      `/admin/orders/${orderId}/status`,
      payload,
    );
    return response.data.data;
  },
};
