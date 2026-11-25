import { apiClient } from '../axios.client';
import type { ApiResponse } from '../../types/api';
import type {
  AdminServiceBookingQuery,
  CreateServiceBookingPayload,
  ServiceBooking,
  ServiceBookingListResult,
  ServiceBookingQuery,
  UpdateServiceBookingStatusPayload,
} from '../../types/service-booking';

const toListResult = (
  response: ApiResponse<ServiceBooking[]>,
): ServiceBookingListResult => ({
  items: response.data,
  meta: response.meta ?? {
    page: 1,
    limit: response.data.length,
    total: response.data.length,
    totalPages: 1,
  },
});

export const serviceBookingService = {
  async create(payload: CreateServiceBookingPayload): Promise<ServiceBooking> {
    const response = await apiClient.post<ApiResponse<ServiceBooking>>(
      '/service-bookings',
      payload,
    );
    return response.data.data;
  },

  async getMine(
    query: ServiceBookingQuery = {},
    signal?: AbortSignal,
  ): Promise<ServiceBookingListResult> {
    const response = await apiClient.get<ApiResponse<ServiceBooking[]>>(
      '/service-bookings',
      { params: query, signal },
    );
    return toListResult(response.data);
  },

  async cancel(id: string, reason: string): Promise<ServiceBooking> {
    const response = await apiClient.post<ApiResponse<ServiceBooking>>(
      `/service-bookings/${id}/cancel`,
      { reason },
    );
    return response.data.data;
  },

  async getAdminList(
    query: AdminServiceBookingQuery = {},
  ): Promise<ServiceBookingListResult> {
    const response = await apiClient.get<ApiResponse<ServiceBooking[]>>(
      '/admin/service-bookings',
      { params: query },
    );
    return toListResult(response.data);
  },

  async getAdminById(id: string): Promise<ServiceBooking> {
    const response = await apiClient.get<ApiResponse<ServiceBooking>>(
      `/admin/service-bookings/${id}`,
    );
    return response.data.data;
  },

  async updateAdminStatus(
    id: string,
    payload: UpdateServiceBookingStatusPayload,
  ): Promise<ServiceBooking> {
    const response = await apiClient.patch<ApiResponse<ServiceBooking>>(
      `/admin/service-bookings/${id}/status`,
      payload,
    );
    return response.data.data;
  },
};
