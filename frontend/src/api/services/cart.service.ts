import { apiClient } from '../axios.client';
import type { ApiResponse } from '../../types/api';
import type {
  AddCartItemPayload,
  Cart,
  UpdateCartItemPayload,
} from '../../types/commerce';

export const cartService = {
  async getMine(): Promise<Cart> {
    const response = await apiClient.get<ApiResponse<Cart>>('/cart');
    return response.data.data;
  },

  async addItem(payload: AddCartItemPayload): Promise<Cart> {
    const response = await apiClient.post<ApiResponse<Cart>>('/cart/items', payload);
    return response.data.data;
  },

  async updateItem(itemId: string, payload: UpdateCartItemPayload): Promise<Cart> {
    const response = await apiClient.patch<ApiResponse<Cart>>(
      `/cart/items/${itemId}`,
      payload,
    );
    return response.data.data;
  },

  async removeItem(itemId: string): Promise<Cart> {
    const response = await apiClient.delete<ApiResponse<Cart>>(
      `/cart/items/${itemId}`,
    );
    return response.data.data;
  },

  async clear(): Promise<Cart> {
    const response = await apiClient.delete<ApiResponse<Cart>>('/cart');
    return response.data.data;
  },
};
