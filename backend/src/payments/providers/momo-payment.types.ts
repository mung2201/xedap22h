export type MomoEnvironment = 'sandbox' | 'production';

/** Persist these non-secret fields unchanged so a retry uses the same request. */
export interface MomoCreateRequest {
  environment: MomoEnvironment;
  partnerCode: string;
  requestId: string;
  orderId: string;
  amount: number;
  orderInfo: string;
  redirectUrl: string;
  ipnUrl: string;
  extraData: string;
  requestType: 'captureWallet';
  autoCapture: true;
  lang: 'vi';
}

export interface MomoCreateResult {
  gatewayUrl: string;
  /** MoMo returns QR content, not an image URL. */
  qrPayload?: string;
  environment: MomoEnvironment;
}

export interface MomoNotification {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  orderInfo: string;
  orderType: string;
  transId: number;
  resultCode: number;
  message: string;
  payType: string;
  responseTime: number;
  extraData: string;
  signature: string;
}

export interface OnlinePaymentOptions {
  provider: 'QR_TRANSFER' | 'MOMO' | 'PAYOS';
  mode: 'SANDBOX' | 'VIETQR' | 'MOMO' | 'PAYOS';
  enabled: boolean;
  environment?: MomoEnvironment;
}
