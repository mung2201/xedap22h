import { apiClient } from '../axios.client';
import type { ApiResponse } from '../../types/api';
import type {
  MoveWishlistToCartPayload,
  Wishlist,
  WishlistMoveToCartResult,
} from '../../types/commerce';

export const wishlistService = {
  async getMine(): Promise<Wishlist> {
    const response = await apiClient.get<ApiResponse<Wishlist>>('/wishlist');
    return response.data.data;
  },

  async getStatus(productId: string): Promise<boolean> {
    const response = await apiClient.get<ApiResponse<{ isWishlisted: boolean }>>(
      `/wishlist/${productId}/status`,
    );
    return response.data.data.isWishlisted;
  },

  async add(productId: string): Promise<Wishlist> {
    const response = await apiClient.post<ApiResponse<Wishlist>>(
      `/wishlist/${productId}`,
    );
    return response.data.data;
  },

  async remove(productId: string): Promise<Wishlist> {
    const response = await apiClient.delete<ApiResponse<Wishlist>>(
      `/wishlist/${productId}`,
    );
    return response.data.data;
  },

  async moveToCart(
    productId: string,
    payload: MoveWishlistToCartPayload,
  ): Promise<WishlistMoveToCartResult> {
    const response = await apiClient.post<ApiResponse<WishlistMoveToCartResult>>(
      `/wishlist/${productId}/move-to-cart`,
      payload,
    );
    return response.data.data;
  },
};
