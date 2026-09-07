import { apiClient } from '../axios.client';
import type { ApiResponse } from '../../types/api';
import type { Address, AddressPayload } from '../../types/address';

export const addressService = {
  async getAll(): Promise<Address[]> {
    const response = await apiClient.get<ApiResponse<Address[]>>('/addresses');
    return response.data.data;
  },

  async create(payload: AddressPayload): Promise<Address> {
    const response = await apiClient.post<ApiResponse<Address>>(
      '/addresses',
      payload,
    );
    return response.data.data;
  },

  async update(addressId: string, payload: Partial<AddressPayload>): Promise<Address> {
    const response = await apiClient.patch<ApiResponse<Address>>(
      `/addresses/${addressId}`,
      payload,
    );
    return response.data.data;
  },

  async setDefault(addressId: string): Promise<Address> {
    const response = await apiClient.patch<ApiResponse<Address>>(
      `/addresses/${addressId}/default`,
    );
    return response.data.data;
  },

  async remove(addressId: string): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/addresses/${addressId}`);
  },
};
