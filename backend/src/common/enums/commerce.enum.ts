export enum VoucherDiscountType {
  PERCENT = 'PERCENT',
  FIXED = 'FIXED',
}

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
  REFUND_PENDING = 'REFUND_PENDING',
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
