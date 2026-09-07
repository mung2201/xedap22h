import { apiClient } from '../axios.client';
import type { ApiResponse } from '../../types/api';
import type {
  AdminProductQuestion,
  AdminProductQuestionListResult,
  AdminProductQuestionQuery,
  ProductQuestion,
  ProductQuestionCreatePayload,
  ProductQuestionListResult,
  ProductQuestionQuery,
  MyProductQuestionQuery,
  UpdateProductQuestionPayload,
} from '../../types/product-question';

const toProductQuestionList = (
  response: ApiResponse<ProductQuestion[]>,
): ProductQuestionListResult => ({
  items: response.data,
  meta: response.meta ?? {
    page: 1,
    limit: response.data.length,
    total: response.data.length,
    totalPages: 1,
  },
});

const toAdminProductQuestionList = (
  response: ApiResponse<AdminProductQuestion[]>,
): AdminProductQuestionListResult => ({
  items: response.data,
  meta: response.meta ?? {
    page: 1,
    limit: response.data.length,
    total: response.data.length,
    totalPages: 1,
  },
});

export const productQuestionService = {
  async getByProduct(
    productId: string,
    query: ProductQuestionQuery = {},
  ): Promise<ProductQuestionListResult> {
    const response = await apiClient.get<ApiResponse<ProductQuestion[]>>(
      `/products/${productId}/questions`,
      { params: query },
    );
    return toProductQuestionList(response.data);
  },

  async create(payload: ProductQuestionCreatePayload): Promise<ProductQuestion> {
    const response = await apiClient.post<ApiResponse<ProductQuestion>>(
      '/product-questions',
      payload,
    );
    return response.data.data;
  },

  async getMine(
    query: MyProductQuestionQuery = {},
  ): Promise<ProductQuestionListResult> {
    const response = await apiClient.get<ApiResponse<ProductQuestion[]>>(
      '/product-questions/mine',
      { params: query },
    );
    return toProductQuestionList(response.data);
  },

  async removeMine(questionId: string): Promise<{ id: string }> {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(
      `/product-questions/${questionId}`,
    );
    return response.data.data;
  },

  async getAdminList(
    query: AdminProductQuestionQuery = {},
  ): Promise<AdminProductQuestionListResult> {
    const response = await apiClient.get<ApiResponse<AdminProductQuestion[]>>(
      '/admin/product-questions',
      { params: query },
    );
    return toAdminProductQuestionList(response.data);
  },

  async updateByAdmin(
    questionId: string,
    payload: UpdateProductQuestionPayload,
  ): Promise<AdminProductQuestion> {
    const response = await apiClient.patch<ApiResponse<AdminProductQuestion>>(
      `/admin/product-questions/${questionId}`,
      payload,
    );
    return response.data.data;
  },
};
