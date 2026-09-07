import { apiClient } from '../axios.client';
import type { ApiResponse } from '../../types/api';
import type {
  SizeGuideListResult,
  SizeGuideQuery,
  SizeGuideRule,
  SizeGuideRulePayload,
  SizeRecommendation,
  SizeRecommendationPayload,
} from '../../types/size-guide';

const toSizeGuideListResult = (
  response: ApiResponse<SizeGuideRule[]>,
): SizeGuideListResult => ({
  items: response.data,
  meta:
    response.meta ?? {
      page: 1,
      limit: response.data.length,
      total: response.data.length,
      totalPages: 1,
    },
});

export const sizeGuideService = {
  async recommend(payload: SizeRecommendationPayload): Promise<SizeRecommendation> {
    const response = await apiClient.post<ApiResponse<SizeRecommendation>>(
      '/size-guide/recommend',
      payload,
    );
    return response.data.data;
  },

  async getAdminList(query: SizeGuideQuery = {}): Promise<SizeGuideListResult> {
    const response = await apiClient.get<ApiResponse<SizeGuideRule[]>>(
      '/admin/size-guides',
      { params: query },
    );
    return toSizeGuideListResult(response.data);
  },

  async create(payload: SizeGuideRulePayload): Promise<SizeGuideRule> {
    const response = await apiClient.post<ApiResponse<SizeGuideRule>>(
      '/admin/size-guides',
      payload,
    );
    return response.data.data;
  },

  async update(
    ruleId: string,
    payload: Partial<SizeGuideRulePayload>,
  ): Promise<SizeGuideRule> {
    const response = await apiClient.patch<ApiResponse<SizeGuideRule>>(
      `/admin/size-guides/${ruleId}`,
      payload,
    );
    return response.data.data;
  },

  async remove(ruleId: string): Promise<{ id: string }> {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(
      `/admin/size-guides/${ruleId}`,
    );
    return response.data.data;
  },
};
