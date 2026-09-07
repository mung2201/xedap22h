import type { ApiMeta } from './api';

export enum VoucherDiscountType {
  PERCENT = 'PERCENT',
  FIXED = 'FIXED',
}

export interface Voucher {
  id: string;
  code: string;
  name: string;
  description?: string;
  discountType: VoucherDiscountType;
  discountValue: number;
  maxDiscount?: number;
  minOrderValue: number;
  startDate: string;
  endDate: string;
  usageLimit?: number;
  usedCount: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VoucherPayload {
  code: string;
  name: string;
  description?: string | null;
  discountType: VoucherDiscountType;
  discountValue: number;
  maxDiscount?: number | null;
  minOrderValue?: number;
  startDate: string;
  endDate: string;
  usageLimit?: number | null;
  active?: boolean;
}

export interface VoucherQuery {
  page?: number;
  limit?: number;
  keyword?: string;
  active?: boolean;
}

export interface VoucherListResult {
  items: Voucher[];
  meta: ApiMeta;
}

export const voucherDiscountTypeLabels: Record<VoucherDiscountType, string> = {
  [VoucherDiscountType.PERCENT]: 'Phần trăm',
  [VoucherDiscountType.FIXED]: 'Số tiền cố định',
};
