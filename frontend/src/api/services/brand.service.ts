import { apiClient } from '../axios.client';
import type { ApiResponse } from '../../types/api';
import type { Brand, BrandPayload } from '../../types/catalog';

export const brandService = {
  async getPublicList(): Promise<Brand[]> {
    const response = await apiClient.get<ApiResponse<Brand[]>>('/brands');
    return response.data.data;
  },

  async getAdminList(): Promise<Brand[]> {
    const response = await apiClient.get<ApiResponse<Brand[]>>('/admin/brands');
    return response.data.data;
  },

  async create(payload: BrandPayload): Promise<Brand> {
    const response = await apiClient.post<ApiResponse<Brand>>(
      '/admin/brands',
      payload,
    );
    return response.data.data;
  },

  async update(id: string, payload: Partial<BrandPayload>): Promise<Brand> {
    const response = await apiClient.patch<ApiResponse<Brand>>(
      `/admin/brands/${id}`,
      payload,
    );
    return response.data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/admin/brands/${id}`);
  },
};
