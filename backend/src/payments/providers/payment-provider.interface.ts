import { PaymentMethod, PaymentStatus } from '../../common/enums/commerce.enum';
import { MomoCreateRequest, MomoEnvironment } from './momo-payment.types';
import { PayosCreateRequest, PayosPaymentStatus } from './payos-payment.types';

export interface PaymentInitiationInput {
  orderCode: string;
  amount: number;
  customerId: string;
}

export type QrPaymentMode = 'SANDBOX' | 'VIETQR' | 'MOMO' | 'PAYOS';

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
  gatewayUrl?: string;
  environment?: MomoEnvironment;
  paymentStarted?: boolean;
  paymentLinkId?: string;
  expiresAt?: string;
  gatewayStatus?: PayosPaymentStatus;
  amountPaid?: number;
}

export interface PaymentInstructionInput extends PaymentInitiationInput {
  paymentReference: string;
  provider?: string;
}

export interface PaymentInitiationResult {
  provider: string;
  paymentStatus: PaymentStatus;
  paymentReference?: string;
  paymentUrl?: string;
  momoRequest?: MomoCreateRequest;
  payosRequest?: PayosCreateRequest;
}

export interface PaymentProvider {
  readonly method: PaymentMethod;
  initiate(input: PaymentInitiationInput): Promise<PaymentInitiationResult>;
  getQrInstruction?(input: PaymentInstructionInput): Promise<QrPaymentInstruction>;
  canConfirmFromCustomer?(): boolean;
}
