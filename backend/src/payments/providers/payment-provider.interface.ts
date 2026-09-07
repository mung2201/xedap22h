import { PaymentMethod, PaymentStatus } from '../../common/enums/commerce.enum';

export interface PaymentInitiationInput {
  orderCode: string;
  amount: number;
  customerId: string;
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

export interface PaymentInstructionInput extends PaymentInitiationInput {
  paymentReference: string;
}

export interface PaymentInitiationResult {
  provider: string;
  paymentStatus: PaymentStatus;
  paymentReference?: string;
  paymentUrl?: string;
}

export interface PaymentProvider {
  readonly method: PaymentMethod;
  initiate(input: PaymentInitiationInput): Promise<PaymentInitiationResult>;
  getQrInstruction?(input: PaymentInstructionInput): Promise<QrPaymentInstruction>;
  canConfirmFromCustomer?(): boolean;
}
