import { Module } from '@nestjs/common';
import { CodPaymentProvider } from './providers/cod-payment.provider';
import { QrTransferPaymentProvider } from './providers/qr-transfer-payment.provider';
import { PaymentsService } from './payments.service';
import { MomoPaymentProvider } from './providers/momo-payment.provider';
import { PayosPaymentProvider } from './providers/payos-payment.provider';

@Module({
  providers: [CodPaymentProvider, QrTransferPaymentProvider, MomoPaymentProvider, PayosPaymentProvider, PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
