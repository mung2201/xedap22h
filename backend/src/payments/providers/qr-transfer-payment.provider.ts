import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PaymentMethod, PaymentStatus } from '../../common/enums/commerce.enum';
import {
  PaymentInitiationInput,
  PaymentInitiationResult,
  PaymentInstructionInput,
  PaymentProvider,
  QrPaymentInstruction,
  QrPaymentMode,
} from './payment-provider.interface';

export const QR_TRANSFER_PAYMENT_PROVIDER = 'QR_TRANSFER';

/**
 * QR transfer provider with an explicit sandbox mode for local/thesis demos.
 * In VIETQR mode it produces a real bank-transfer QR; confirmation still has
 * to come from a verified gateway/bank webhook, never from the browser.
 */
@Injectable()
export class QrTransferPaymentProvider implements PaymentProvider {
  readonly method = PaymentMethod.ONLINE;

  constructor(private readonly configService: ConfigService) {}

  async initiate(
    input: PaymentInitiationInput,
  ): Promise<PaymentInitiationResult> {
    const frontendUrl = this.configService.getOrThrow<string>('app.frontendUrl');
    const paymentReference = `QR-${randomUUID()}`;
    const parameters = new URLSearchParams({
      orderCode: input.orderCode,
      paymentRef: paymentReference,
    });

    return {
      provider: QR_TRANSFER_PAYMENT_PROVIDER,
      paymentStatus: PaymentStatus.UNPAID,
      paymentReference,
      paymentUrl: `${frontendUrl}/payment/qr?${parameters.toString()}`,
    };
  }

  async getQrInstruction(
    input: PaymentInstructionInput,
  ): Promise<QrPaymentInstruction> {
    const mode = this.configService.getOrThrow<QrPaymentMode>('payment.qr.mode');
    const transferContent = this.getTransferContent(input.orderCode);

    if (mode === 'VIETQR') {
      const bankBin = this.configService.getOrThrow<string>('payment.qr.bankBin');
      const accountNumber = this.configService.getOrThrow<string>(
        'payment.qr.accountNumber',
      );
      const accountName = this.configService.getOrThrow<string>(
        'payment.qr.accountName',
      );
      const template = this.configService.getOrThrow<string>(
        'payment.qr.template',
      );
      const imageUrl = new URL(
        `https://img.vietqr.io/image/${bankBin}-${accountNumber}-${template}.png`,
      );
      imageUrl.searchParams.set('amount', String(Math.round(input.amount)));
      imageUrl.searchParams.set('addInfo', transferContent);
      imageUrl.searchParams.set('accountName', accountName);

      return {
        mode,
        amount: input.amount,
        transferContent,
        paymentReference: input.paymentReference,
        instructions:
          'Mở ứng dụng ngân hàng để quét mã VietQR. Giữ nguyên số tiền và nội dung chuyển khoản để cửa hàng đối soát.',
        customerCanConfirm: false,
        qrImageUrl: imageUrl.toString(),
        bankBin,
        accountNumber,
        accountName,
      };
    }

    return {
      mode: 'SANDBOX',
      amount: input.amount,
      transferContent,
      paymentReference: input.paymentReference,
      instructions:
        'Đây là mã QR mô phỏng cho môi trường demo. Quét mã hoặc bấm xác nhận để kiểm tra toàn bộ luồng thanh toán.',
      customerCanConfirm: true,
      qrPayload: JSON.stringify({
        service: 'BIKE_STORE_SANDBOX',
        orderCode: input.orderCode,
        amount: Math.round(input.amount),
        transferContent,
        paymentReference: input.paymentReference,
      }),
    };
  }

  canConfirmFromCustomer(): boolean {
    return (
      this.configService.getOrThrow<QrPaymentMode>('payment.qr.mode') ===
      'SANDBOX'
    );
  }

  private getTransferContent(orderCode: string): string {
    const prefix = this.configService.getOrThrow<string>(
      'payment.qr.transferContentPrefix',
    );

    return `${prefix}-${orderCode}`.slice(0, 50);
  }
}
