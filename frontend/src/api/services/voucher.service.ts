import { apiClient } from '../axios.client';
import type { ApiResponse } from '../../types/api';
import type {
  Voucher,
  VoucherListResult,
  VoucherPayload,
  VoucherQuery,
} from '../../types/voucher';

const toVoucherListResult = (response: ApiResponse<Voucher[]>): VoucherListResult => ({
  items: response.data,
  meta:
    response.meta ?? {
      page: 1,
      limit: response.data.length,
      total: response.data.length,
      totalPages: 1,
    },
});

export const voucherService = {
  async getAdminList(query: VoucherQuery = {}): Promise<VoucherListResult> {
    const response = await apiClient.get<ApiResponse<Voucher[]>>('/admin/vouchers', {
      params: query,
    });
    return toVoucherListResult(response.data);
  },

  async create(payload: VoucherPayload): Promise<Voucher> {
    const response = await apiClient.post<ApiResponse<Voucher>>('/admin/vouchers', payload);
    return response.data.data;
  },

  async update(voucherId: string, payload: Partial<VoucherPayload>): Promise<Voucher> {
    const response = await apiClient.patch<ApiResponse<Voucher>>(
      `/admin/vouchers/${voucherId}`,
      payload,
    );
    return response.data.data;
  },

  async remove(voucherId: string): Promise<{ id: string }> {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(
      `/admin/vouchers/${voucherId}`,
    );
    return response.data.data;
  },
};
