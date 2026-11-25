import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentMethod } from '../common/enums/commerce.enum';
import { CodPaymentProvider } from './providers/cod-payment.provider';
import { QrTransferPaymentProvider, QR_TRANSFER_PAYMENT_PROVIDER } from './providers/qr-transfer-payment.provider';
import { MomoPaymentProvider, MOMO_PAYMENT_PROVIDER } from './providers/momo-payment.provider';
import { MomoCreateRequest, MomoCreateResult, MomoNotification, OnlinePaymentOptions } from './providers/momo-payment.types';
import { PayosPaymentProvider, PAYOS_PAYMENT_PROVIDER } from './providers/payos-payment.provider';
import { PayosCreateRequest, PayosCreateResult, PayosNotification, PayosPaymentState } from './providers/payos-payment.types';
import {
  PaymentInitiationInput,
  PaymentInitiationResult,
  PaymentInstructionInput,
  QrPaymentInstruction,
} from './providers/payment-provider.interface';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly codPaymentProvider: CodPaymentProvider,
    private readonly qrTransferPaymentProvider: QrTransferPaymentProvider,
    @Optional() private readonly momoPaymentProvider?: MomoPaymentProvider,
    @Optional() private readonly configService?: ConfigService,
    @Optional() private readonly payosPaymentProvider?: PayosPaymentProvider,
  ) {}

  async initiate(
    method: PaymentMethod,
    input: PaymentInitiationInput,
  ): Promise<PaymentInitiationResult> {
    if (method === PaymentMethod.COD) {
      return this.codPaymentProvider.initiate(input);
    }
    if (method !== PaymentMethod.ONLINE) {
      throw new BadRequestException('Unsupported payment method.');
    }
    if (this.selectedOnlineProvider() === PAYOS_PAYMENT_PROVIDER) {
      return this.requirePayos().initiate(input);
    }
    return this.selectedOnlineProvider() === MOMO_PAYMENT_PROVIDER
      ? this.requireMomo().initiate(input)
      : this.qrTransferPaymentProvider.initiate(input);
  }

  async getOnlineQrInstruction(
    input: PaymentInstructionInput,
  ): Promise<QrPaymentInstruction> {
    const provider = input.provider ?? this.selectedOnlineProvider();
    if (provider !== QR_TRANSFER_PAYMENT_PROVIDER && provider !== 'MOCK_ONLINE') {
      throw new BadRequestException('Gateway instructions must come from the saved payment request.');
    }
    return this.qrTransferPaymentProvider.getQrInstruction(input);
  }

  canConfirmOnlinePaymentFromCustomer(provider?: string): boolean {
    const selected = provider ?? this.selectedOnlineProvider();
    return (selected === QR_TRANSFER_PAYMENT_PROVIDER || selected === 'MOCK_ONLINE') &&
      this.qrTransferPaymentProvider.canConfirmFromCustomer();
  }

  getOnlinePaymentOptions(): OnlinePaymentOptions {
    if (this.selectedOnlineProvider() === PAYOS_PAYMENT_PROVIDER) {
      return { provider: PAYOS_PAYMENT_PROVIDER, mode: 'PAYOS', enabled: this.payosPaymentProvider?.isEnabled() ?? false };
    }
    if (this.selectedOnlineProvider() === MOMO_PAYMENT_PROVIDER) {
      return {
        provider: MOMO_PAYMENT_PROVIDER,
        mode: 'MOMO',
        enabled: this.momoPaymentProvider?.isEnabled() ?? false,
        environment: this.momoPaymentProvider?.getEnvironment() ?? 'sandbox',
      };
    }
    return {
      provider: QR_TRANSFER_PAYMENT_PROVIDER,
      mode: this.configService?.get<'SANDBOX' | 'VIETQR'>('payment.qr.mode') ?? 'SANDBOX',
      enabled: true,
    };
  }

  createMomoPayment(request: MomoCreateRequest): Promise<MomoCreateResult> {
    return this.requireMomo().createPayment(request);
  }

  verifyMomoNotification(body: unknown): MomoNotification {
    return this.requireMomo().verifyNotification(body);
  }

  createPayosPayment(request: PayosCreateRequest, retry = false): Promise<PayosCreateResult> {
    return this.requirePayos().createPayment(request, retry);
  }

  getPayosPayment(request: PayosCreateRequest): Promise<PayosPaymentState> {
    return this.requirePayos().readPayment(request);
  }

  verifyPayosNotification(body: unknown): PayosNotification {
    return this.requirePayos().verifyNotification(body);
  }

  private selectedOnlineProvider(): 'QR_TRANSFER' | 'MOMO' | 'PAYOS' {
    return this.configService?.get<'QR_TRANSFER' | 'MOMO' | 'PAYOS'>('payment.onlineProvider') ?? 'QR_TRANSFER';
  }

  private requirePayos(): PayosPaymentProvider {
    if (!this.payosPaymentProvider) throw new BadRequestException('payOS chưa được cấu hình trên máy chủ.');
    return this.payosPaymentProvider;
  }

  private requireMomo(): MomoPaymentProvider {
    if (!this.momoPaymentProvider) {
      throw new BadRequestException('MoMo chưa được cấu hình trên máy chủ.');
    }
    return this.momoPaymentProvider;
  }
}
