import type { ApiMeta } from './api';

export enum ShippingMethod {
  STANDARD = 'STANDARD',
  EXPRESS = 'EXPRESS',
}

export enum PaymentMethod {
  COD = 'COD',
  ONLINE = 'ONLINE',
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PACKING = 'PACKING',
  SHIPPING = 'SHIPPING',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export interface ShippingAddressSnapshot {
  recipientName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  addressLine: string;
  note?: string;
}

export interface CheckoutItem {
  productId: string;
  categoryId: string;
  variantId: string;
  name: string;
  slug: string;
  productSku: string;
  image: string;
  color: string;
  colorHex?: string;
  size: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface CheckoutVoucher {
  voucherId: string;
  code: string;
  name: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  discountAmount: number;
}

export interface CheckoutPreviewPayload {
  addressId: string;
  voucherCode?: string;
  shippingMethod: ShippingMethod;
}

export interface CheckoutPreview {
  cartId: string;
  shippingAddress: ShippingAddressSnapshot;
  items: CheckoutItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  shippingMethod: ShippingMethod;
  voucher?: CheckoutVoucher;
}

export interface CreateOrderPayload extends CheckoutPreviewPayload {
  paymentMethod: PaymentMethod;
  customerEmail?: string;
  note?: string;
}

export interface OrderItem {
  productId: string;
  categoryId?: string;
  variantId: string;
  name: string;
  slug: string;
  productSku: string;
  sku: string;
  image: string;
  color: string;
  colorHex?: string;
  size: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  orderCode: string;
  customerInfo: {
    fullName: string;
    email: string;
    phone: string;
  };
  shippingAddress: ShippingAddressSnapshot;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  voucher?: {
    code: string;
    name: string;
    discountAmount: number;
  };
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paidAt?: string;
  refundedAt?: string;
  paymentProvider?: string;
  paymentReference?: string;
  paymentUrl?: string;
  orderStatus: OrderStatus;
  statusHistory: Array<{
    status: OrderStatus;
    note?: string;
    changedAt: string;
  }>;
  note?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type QrPaymentMode = 'SANDBOX' | 'VIETQR';

export interface QrPaymentInstruction {
  mode: QrPaymentMode;
  amount: number;
  transferContent: string;
  paymentReference: string;
  instructions: string;
  customerCanConfirm: boolean;
  qrPayload?: string;
  qrImageUrl?: string;
  bankBin?: string;
  accountNumber?: string;
  accountName?: string;
}

export interface OnlinePaymentDetails {
  order: Order;
  instruction: QrPaymentInstruction;
}

export interface MyOrdersQuery {
  page?: number;
  limit?: number;
  status?: OrderStatus;
}

export interface OrderListResult {
  items: Order[];
  meta: ApiMeta;
}

export interface TrackOrderPayload {
  orderCode: string;
  phone: string;
}

export interface OrderTrackingResult {
  orderCode: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  shippingMethod: ShippingMethod;
  statusHistory: Array<{
    status: OrderStatus;
    changedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export const orderStatusLabels: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'Chờ xác nhận',
  [OrderStatus.CONFIRMED]: 'Đã xác nhận',
  [OrderStatus.PACKING]: 'Đang đóng gói',
  [OrderStatus.SHIPPING]: 'Đang giao',
  [OrderStatus.DELIVERED]: 'Đã giao',
  [OrderStatus.CANCELLED]: 'Đã huỷ',
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  [PaymentStatus.UNPAID]: 'Chưa thanh toán',
  [PaymentStatus.PAID]: 'Đã thanh toán',
  [PaymentStatus.FAILED]: 'Thanh toán lỗi',
  [PaymentStatus.REFUNDED]: 'Đã hoàn tiền',
};
