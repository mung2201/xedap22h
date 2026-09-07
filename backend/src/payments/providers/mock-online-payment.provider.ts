import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PaymentMethod, PaymentStatus } from '../../common/enums/commerce.enum';
import {
  PaymentInitiationInput,
  PaymentInitiationResult,
  PaymentProvider,
} from './payment-provider.interface';

export const MOCK_ONLINE_PAYMENT_PROVIDER = 'MOCK_ONLINE';

/**
 * Deliberately isolated mock provider. A real provider can implement the same
 * interface without changing Checkout or OrdersService.
 */
@Injectable()
export class MockOnlinePaymentProvider implements PaymentProvider {
  readonly method = PaymentMethod.ONLINE;

  constructor(private readonly configService: ConfigService) {}

  async initiate(
    input: PaymentInitiationInput,
  ): Promise<PaymentInitiationResult> {
    const frontendUrl = this.configService.getOrThrow<string>('app.frontendUrl');
    const parameters = new URLSearchParams({
      orderCode: input.orderCode,
      paymentRef: `MOCK-${randomUUID()}`,
    });

    return {
      provider: MOCK_ONLINE_PAYMENT_PROVIDER,
      paymentStatus: PaymentStatus.UNPAID,
      paymentReference: parameters.get('paymentRef') ?? undefined,
      paymentUrl: `${frontendUrl}/payment/mock?${parameters.toString()}`,
    };
  }
}
