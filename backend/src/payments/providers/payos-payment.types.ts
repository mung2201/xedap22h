/** Non-secret snapshot. Reuse it unchanged when retrying an existing order. */
export interface PayosCreateRequest {
  clientId: string;
  orderCode: number;
  amount: number;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  expiredAt: number;
}

export type PayosPaymentStatus =
  | 'PENDING' | 'PROCESSING' | 'UNDERPAID' | 'PAID'
  | 'CANCELLED' | 'EXPIRED' | 'FAILED';

export interface PayosCreateResult {
  gatewayUrl: string;
  qrPayload?: string;
  paymentLinkId: string;
  description: string;
  status: PayosPaymentStatus;
  bankBin?: string;
  accountNumber?: string;
  accountName?: string;
}

export interface PayosTransaction {
  reference: string;
  amount: number;
  accountNumber: string;
  description: string;
  transactionDateTime: string;
}

export interface PayosPaymentState {
  orderCode: number;
  paymentLinkId: string;
  amount: number;
  amountPaid: number;
  amountRemaining: number;
  status: PayosPaymentStatus;
  transactions: PayosTransaction[];
}

/** Only authenticated data fields; the surrounding success/code are not signed. */
export interface PayosNotification extends PayosTransaction {
  orderCode: number;
  currency: string;
  paymentLinkId: string;
  code: string;
  desc: string;
}
