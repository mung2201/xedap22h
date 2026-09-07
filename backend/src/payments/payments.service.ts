import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentMethod } from '../common/enums/commerce.enum';
import { CodPaymentProvider } from './providers/cod-payment.provider';
import { QrTransferPaymentProvider } from './providers/qr-transfer-payment.provider';
import {
  PaymentInitiationInput,
  PaymentInitiationResult,
  PaymentInstructionInput,
  PaymentProvider,
  QrPaymentInstruction,
} from './providers/payment-provider.interface';

@Injectable()
export class PaymentsService {
  private readonly providers: Map<PaymentMethod, PaymentProvider>;

  constructor(
    codPaymentProvider: CodPaymentProvider,
    qrTransferPaymentProvider: QrTransferPaymentProvider,
  ) {
    this.providers = new Map<PaymentMethod, PaymentProvider>([
      [codPaymentProvider.method, codPaymentProvider],
      [qrTransferPaymentProvider.method, qrTransferPaymentProvider],
    ]);
  }

  async initiate(
    method: PaymentMethod,
    input: PaymentInitiationInput,
  ): Promise<PaymentInitiationResult> {
    const provider = this.providers.get(method);

    if (!provider) {
      throw new BadRequestException('Unsupported payment method.');
    }

    return provider.initiate(input);
  }

  async getOnlineQrInstruction(
    input: PaymentInstructionInput,
  ): Promise<QrPaymentInstruction> {
    const provider = this.providers.get(PaymentMethod.ONLINE);

    if (!provider?.getQrInstruction) {
      throw new BadRequestException('Online QR payment is not configured.');
    }

    return provider.getQrInstruction(input);
  }

  canConfirmOnlinePaymentFromCustomer(): boolean {
    return (
      this.providers.get(PaymentMethod.ONLINE)?.canConfirmFromCustomer?.() ??
      false
    );
  }
}
