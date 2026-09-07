import { apiClient } from '../axios.client';
import type { ApiResponse } from '../../types/api';
import type {
  CreateReviewPayload,
  CreateReviewResult,
  ProductReviewListResult,
  ProductReviewQuery,
  Review,
  ReviewEligibility,
} from '../../types/review';

const toReviewListResult = (
  response: ApiResponse<Review[]>,
): ProductReviewListResult => ({
  items: response.data,
  meta:
    response.meta ?? {
      page: 1,
      limit: response.data.length,
      total: response.data.length,
      totalPages: 1,
    },
});

export const reviewService = {
  async getByProduct(
    productId: string,
    query: ProductReviewQuery = {},
  ): Promise<ProductReviewListResult> {
    const response = await apiClient.get<ApiResponse<Review[]>>(
      `/products/${productId}/reviews`,
      { params: query },
    );
    return toReviewListResult(response.data);
  },

  async getEligibility(productId: string): Promise<ReviewEligibility> {
    const response = await apiClient.get<ApiResponse<ReviewEligibility>>(
      `/reviews/eligibility/${productId}`,
    );
    return response.data.data;
  },

  async create(payload: CreateReviewPayload): Promise<CreateReviewResult> {
    const response = await apiClient.post<ApiResponse<CreateReviewResult>>(
      '/reviews',
      payload,
    );
    return response.data.data;
  },
};
