import { Injectable } from '@nestjs/common';
import { PaymentMethod, PaymentStatus } from '../../common/enums/commerce.enum';
import {
  PaymentInitiationInput,
  PaymentInitiationResult,
  PaymentProvider,
} from './payment-provider.interface';

@Injectable()
export class CodPaymentProvider implements PaymentProvider {
  readonly method = PaymentMethod.COD;

  async initiate(
    _input: PaymentInitiationInput,
  ): Promise<PaymentInitiationResult> {
    return {
      provider: 'COD',
      paymentStatus: PaymentStatus.UNPAID,
    };
  }
}
