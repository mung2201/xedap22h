import { apiClient } from '../axios.client';
import type { ApiResponse } from '../../types/api';
import type {
  CreateOrderPayload,
  MyOrdersQuery,
  Order,
  OrderListResult,
  OrderTrackingResult,
  OnlinePaymentDetails,
  TrackOrderPayload,
} from '../../types/order';

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

export const orderService = {
  async create(payload: CreateOrderPayload): Promise<Order> {
    const response = await apiClient.post<ApiResponse<Order>>('/orders', payload);
    return response.data.data;
  },

  async getMine(query: MyOrdersQuery = {}): Promise<OrderListResult> {
    const response = await apiClient.get<ApiResponse<Order[]>>('/orders/my-orders', {
      params: query,
    });
    return toOrderListResult(response.data);
  },

  async getById(orderId: string): Promise<Order> {
    const response = await apiClient.get<ApiResponse<Order>>(`/orders/${orderId}`);
    return response.data.data;
  },

  async track(payload: TrackOrderPayload): Promise<OrderTrackingResult> {
    const response = await apiClient.post<ApiResponse<OrderTrackingResult>>(
      '/orders/track',
      payload,
    );
    return response.data.data;
  },

  async cancel(orderId: string, reason: string): Promise<Order> {
    const response = await apiClient.post<ApiResponse<Order>>(
      `/orders/${orderId}/cancel`,
      { reason },
    );
    return response.data.data;
  },

  async confirmMockPayment(
    orderCode: string,
    paymentReference: string,
  ): Promise<Order> {
    const response = await apiClient.post<ApiResponse<Order>>(
      `/orders/mock-payment/${encodeURIComponent(orderCode)}/confirm`,
      { paymentReference },
    );
    return response.data.data;
  },

  async getOnlinePayment(
    orderCode: string,
    paymentReference?: string,
  ): Promise<OnlinePaymentDetails> {
    const response = await apiClient.get<ApiResponse<OnlinePaymentDetails>>(
      `/orders/online-payment/${encodeURIComponent(orderCode)}`,
      { params: paymentReference ? { paymentRef: paymentReference } : undefined },
    );
    return response.data.data;
  },

  async confirmSandboxQrPayment(
    orderCode: string,
    paymentReference: string,
  ): Promise<Order> {
    const response = await apiClient.post<ApiResponse<Order>>(
      `/orders/online-payment/${encodeURIComponent(orderCode)}/confirm`,
      { paymentReference },
    );
    return response.data.data;
  },
};
