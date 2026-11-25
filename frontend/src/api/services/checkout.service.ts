import { apiClient } from '../axios.client';
import type { ApiResponse } from '../../types/api';
import type {
  CheckoutPreview,
  CheckoutPreviewPayload,
} from '../../types/order';

export const checkoutService = {
  async preview(payload: CheckoutPreviewPayload, signal?: AbortSignal): Promise<CheckoutPreview> {
    const response = await apiClient.post<ApiResponse<CheckoutPreview>>(
      '/checkout/preview',
      payload,
      { signal },
    );
    return response.data.data;
  },
};
