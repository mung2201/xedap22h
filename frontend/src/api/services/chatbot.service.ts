import { apiClient } from '../axios.client';
import type { ApiResponse } from '../../types/api';
import type {
  ChatbotMessagePayload,
  ChatbotMessageResponse,
  ChatbotSuggestion,
  FaqEntry,
  FaqListResult,
  FaqPayload,
  FaqQuery,
} from '../../types/chatbot';

const toFaqListResult = (response: ApiResponse<FaqEntry[]>): FaqListResult => ({
  items: response.data,
  meta:
    response.meta ?? {
      page: 1,
      limit: response.data.length,
      total: response.data.length,
      totalPages: 1,
    },
});

export const chatbotService = {
  async getSuggestions(): Promise<ChatbotSuggestion[]> {
    const response = await apiClient.get<ApiResponse<ChatbotSuggestion[]>>(
      '/chatbot/suggestions',
    );
    return response.data.data;
  },

  async sendMessage(
    payload: ChatbotMessagePayload,
  ): Promise<ChatbotMessageResponse> {
    const response = await apiClient.post<ApiResponse<ChatbotMessageResponse>>(
      '/chatbot/message',
      payload,
    );
    return response.data.data;
  },

  async getAdminFaqs(query: FaqQuery = {}): Promise<FaqListResult> {
    const response = await apiClient.get<ApiResponse<FaqEntry[]>>(
      '/admin/chatbot/faqs',
      { params: query },
    );
    return toFaqListResult(response.data);
  },

  async createFaq(payload: FaqPayload): Promise<FaqEntry> {
    const response = await apiClient.post<ApiResponse<FaqEntry>>(
      '/admin/chatbot/faqs',
      payload,
    );
    return response.data.data;
  },

  async updateFaq(
    faqId: string,
    payload: Partial<FaqPayload>,
  ): Promise<FaqEntry> {
    const response = await apiClient.patch<ApiResponse<FaqEntry>>(
      `/admin/chatbot/faqs/${faqId}`,
      payload,
    );
    return response.data.data;
  },

  async removeFaq(faqId: string): Promise<{ id: string }> {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(
      `/admin/chatbot/faqs/${faqId}`,
    );
    return response.data.data;
  },
};
