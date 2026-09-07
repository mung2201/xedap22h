import { apiClient } from '../axios.client';
import type { ApiResponse } from '../../types/api';
import type {
  Category,
  CategoryPayload,
  CategoryTreeNode,
} from '../../types/catalog';

export const categoryService = {
  async getTree(): Promise<CategoryTreeNode[]> {
    const response = await apiClient.get<ApiResponse<CategoryTreeNode[]>>(
      '/categories',
    );
    return response.data.data;
  },

  async getAdminList(): Promise<Category[]> {
    const response = await apiClient.get<ApiResponse<Category[]>>(
      '/admin/categories',
    );
    return response.data.data;
  },

  async create(payload: CategoryPayload): Promise<Category> {
    const response = await apiClient.post<ApiResponse<Category>>(
      '/admin/categories',
      payload,
    );
    return response.data.data;
  },

  async update(id: string, payload: Partial<CategoryPayload>): Promise<Category> {
    const response = await apiClient.patch<ApiResponse<Category>>(
      `/admin/categories/${id}`,
      payload,
    );
    return response.data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/admin/categories/${id}`);
  },
};
