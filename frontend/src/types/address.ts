export type AddressFormat = 'CURRENT' | 'LEGACY';

export interface Address {
  id: string;
  recipientName: string;
  phone: string;
  province: string;
  district: string;
  addressFormat?: AddressFormat;
  ward: string;
  addressLine: string;
  note?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AddressPayload {
  recipientName: string;
  phone: string;
  province: string;
  district: string;
  addressFormat?: AddressFormat;
  ward: string;
  addressLine: string;
  note?: string;
  isDefault?: boolean;
}
