import { apiClient } from '../axios.client';
import type { ApiResponse } from '../../types/api';
import type {
  RecommendationFlowResponse,
  RecommendationMessagePayload,
} from '../../types/recommendation';

export const recommendationService = {
  async start(): Promise<RecommendationFlowResponse> {
    const response = await apiClient.post<ApiResponse<RecommendationFlowResponse>>(
      '/chatbot/recommendation/start',
    );
    return response.data.data;
  },

  async sendMessage(
    payload: RecommendationMessagePayload,
  ): Promise<RecommendationFlowResponse> {
    const response = await apiClient.post<ApiResponse<RecommendationFlowResponse>>(
      '/chatbot/recommendation/message',
      payload,
    );
    return response.data.data;
  },
};
