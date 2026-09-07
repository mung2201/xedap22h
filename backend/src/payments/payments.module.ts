import { Module } from '@nestjs/common';
import { CodPaymentProvider } from './providers/cod-payment.provider';
import { QrTransferPaymentProvider } from './providers/qr-transfer-payment.provider';
import { PaymentsService } from './payments.service';

@Module({
  providers: [CodPaymentProvider, QrTransferPaymentProvider, PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
