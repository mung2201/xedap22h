import { apiClient } from '../axios.client';
import type { ApiResponse } from '../../types/api';
import type {
  AdminProductListQuery,
  Product,
  ProductFacets,
  ProductListQuery,
  ProductListResult,
  ProductPayload,
} from '../../types/catalog';

const toProductListResult = (
  response: ApiResponse<Product[]>,
): ProductListResult => ({
  items: response.data,
  meta: response.meta ?? { page: 1, limit: response.data.length, total: response.data.length, totalPages: 1 },
});

export const productService = {
  async getPublicList(query: ProductListQuery = {}): Promise<ProductListResult> {
    const response = await apiClient.get<ApiResponse<Product[]>>('/products', {
      params: query,
    });
    return toProductListResult(response.data);
  },

  async getBySlug(slug: string): Promise<Product> {
    const response = await apiClient.get<ApiResponse<Product>>(`/products/${slug}`);
    return response.data.data;
  },

  async getRelated(slug: string): Promise<Product[]> {
    const response = await apiClient.get<ApiResponse<Product[]>>(
      `/products/${slug}/related`,
    );
    return response.data.data;
  },

  async getPublicFacets(): Promise<ProductFacets> {
    const response = await apiClient.get<ApiResponse<ProductFacets>>('/products/facets');
    return response.data.data;
  },

  async getAdminList(
    query: AdminProductListQuery = {},
  ): Promise<ProductListResult> {
    const response = await apiClient.get<ApiResponse<Product[]>>('/admin/products', {
      params: query,
    });
    return toProductListResult(response.data);
  },

  async getAdminById(id: string): Promise<Product> {
    const response = await apiClient.get<ApiResponse<Product>>(
      `/admin/products/${id}`,
    );
    return response.data.data;
  },

  async create(payload: ProductPayload): Promise<Product> {
    const response = await apiClient.post<ApiResponse<Product>>(
      '/admin/products',
      payload,
    );
    return response.data.data;
  },

  async update(id: string, payload: Partial<ProductPayload>): Promise<Product> {
    const response = await apiClient.patch<ApiResponse<Product>>(
      `/admin/products/${id}`,
      payload,
    );
    return response.data.data;
  },
};
