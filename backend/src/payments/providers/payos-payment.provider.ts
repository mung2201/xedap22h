import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { PaymentMethod, PaymentStatus } from '../../common/enums/commerce.enum';
import {
  PaymentInitiationInput,
  PaymentInitiationResult,
  PaymentProvider,
} from './payment-provider.interface';
import {
  PayosCreateRequest,
  PayosCreateResult,
  PayosNotification,
  PayosPaymentState,
  PayosPaymentStatus,
  PayosTransaction,
} from './payos-payment.types';

export const PAYOS_PAYMENT_PROVIDER = 'PAYOS';
export class PayosPaymentNotFoundException extends BadGatewayException {
  constructor() {
    super('payOS chưa tìm thấy thông tin thanh toán. Vui lòng thử lại trên đơn hàng này.');
  }
}
const API_URL = 'https://api-merchant.payos.vn/v2/payment-requests';
const LINK_ID = /^[a-f0-9]{32}$/i;
const STATUSES: readonly string[] = [
  'PENDING', 'PROCESSING', 'UNDERPAID', 'PAID', 'CANCELLED', 'EXPIRED', 'FAILED',
];

interface PayosConfiguration {
  clientId: string;
  apiKey: string;
  checksumKey: string;
  expiryMinutes: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isInteger(value: unknown, minimum = 0): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum;
}

function isText(value: unknown, maximum = 500, minimum = 0): value is string {
  return typeof value === 'string' && value.length >= minimum && value.length <= maximum;
}

function isWebUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

/** payment-requests uses alphabetical keys and no URI encoding (unlike payouts). */
function signatureContent(data: Record<string, unknown>): string {
  return Object.keys(data).sort().filter((key) => data[key] !== undefined).map((key) => {
    let value = data[key];
    if (Array.isArray(value)) {
      value = JSON.stringify(value.map((entry: unknown) => {
        if (!isRecord(entry)) throw new Error('Invalid signed array.');
        return Object.fromEntries(Object.keys(entry).sort().map((field) => [field, entry[field]]));
      }));
    } else if (isRecord(value)) {
      // The payment API has no nested objects except transaction array entries.
      // Reject ambiguous [object Object] serialization instead of authenticating it.
      throw new Error('Invalid signed object.');
    }
    if (value === null || value === undefined || value === 'null' || value === 'undefined') value = '';
    return `${key}=${String(value)}`;
  }).join('&');
}

@Injectable()
export class PayosPaymentProvider implements PaymentProvider {
  readonly method = PaymentMethod.ONLINE;

  constructor(private readonly configService: ConfigService) {}

  isEnabled(): boolean {
    try {
      this.getConfiguration();
      return true;
    } catch {
      return false;
    }
  }

  canConfirmFromCustomer(): boolean {
    return false;
  }

  /** Called inside MongoDB's transaction: prepare a snapshot without network I/O. */
  async initiate(input: PaymentInitiationInput): Promise<PaymentInitiationResult> {
    const configuration = this.getConfiguration();
    this.assertAmount(input.amount);
    // Cryptographic 48-bit identifiers fit safely in the gateway's integer field.
    const orderCode = randomInt(1_000_000_000_000, 2 ** 48 - 1);
    const paymentReference = `PAYOS-${orderCode}`;
    const url = new URL('/payment/qr', this.configService.getOrThrow<string>('app.frontendUrl'));
    // payOS appends its numeric orderCode on return; keep the store code separate.
    url.searchParams.set('storeOrderCode', input.orderCode);
    url.searchParams.set('paymentRef', paymentReference);
    if (!isWebUrl(url.toString())) throw new BadRequestException('Địa chỉ trả về thanh toán không hợp lệ.');
    const paymentUrl = url.toString();
    return {
      provider: PAYOS_PAYMENT_PROVIDER,
      paymentStatus: PaymentStatus.UNPAID,
      paymentReference,
      paymentUrl,
      payosRequest: {
        clientId: configuration.clientId,
        orderCode,
        amount: input.amount,
        // Nine ASCII characters work with both linked and non-linked bank accounts.
        description: `XD${String(orderCode).slice(-7).padStart(7, '0')}`,
        returnUrl: paymentUrl,
        cancelUrl: paymentUrl,
        expiredAt: Math.floor(Date.now() / 1000) + configuration.expiryMinutes * 60,
      },
    };
  }

  /** Only call after the order commit; a retry always uses the saved orderCode. */
  async createPayment(request: PayosCreateRequest, retry = false): Promise<PayosCreateResult> {
    const configuration = this.assertRequest(request);
    if (retry) {
      try {
        return await this.recoverPayment(request);
      } catch (error) {
        // Only an explicit not-found allows re-sending the SAME saved request.
        // Timeouts, bad signatures and other errors leave the outcome unknown.
        if (!(error instanceof PayosPaymentNotFoundException)) throw error;
      }
    }
    // Never create another payment after the stored link's lifetime has elapsed.
    if (request.expiredAt <= Math.floor(Date.now() / 1000)) return this.recoverPayment(request);
    const rawSignature = `amount=${request.amount}&cancelUrl=${request.cancelUrl}&description=${request.description}&orderCode=${request.orderCode}&returnUrl=${request.returnUrl}`;
    const body = {
      orderCode: request.orderCode,
      amount: request.amount,
      description: request.description,
      cancelUrl: request.cancelUrl,
      returnUrl: request.returnUrl,
      expiredAt: request.expiredAt,
      signature: this.sign(rawSignature, configuration.checksumKey),
    };
    let payload: unknown;
    try {
      payload = await this.sendRequest(API_URL, configuration, body);
    } catch {
      // The gateway may have accepted a request whose response was lost.
      return this.recoverPayment(request);
    }
    if (!isRecord(payload) || payload.code !== '00') return this.recoverPayment(request);
    const data = this.verifiedResponse(payload, configuration);
    if (
      data.orderCode !== request.orderCode || data.amount !== request.amount || data.currency !== 'VND' ||
      !isText(data.paymentLinkId, 32, 32) || !LINK_ID.test(data.paymentLinkId) ||
      !isText(data.checkoutUrl, 2048, 1) || !this.isGatewayUrl(data.checkoutUrl, data.paymentLinkId) ||
      !isText(data.description, 500, 1) || !isText(data.qrCode, 4096, 1) ||
      !isText(data.bin, 6, 6) || !/^\d{6}$/.test(data.bin) ||
      !isText(data.accountNumber, 100, 1) || !isText(data.accountName, 300, 1) ||
      !isText(data.status) || !STATUSES.includes(data.status)
    ) {
      throw new BadGatewayException('Thông tin thanh toán payOS không khớp đơn hàng.');
    }
    return {
      gatewayUrl: data.checkoutUrl,
      qrPayload: data.qrCode,
      paymentLinkId: data.paymentLinkId,
      description: data.description,
      status: data.status as PayosPaymentStatus,
      bankBin: data.bin,
      accountNumber: data.accountNumber,
      accountName: data.accountName,
    };
  }

  async readPayment(request: PayosCreateRequest): Promise<PayosPaymentState> {
    const configuration = this.assertRequest(request);
    const payload = await this.sendRequest(`${API_URL}/${request.orderCode}`, configuration);
    const data = this.verifiedResponse(payload, configuration, true);
    if (
      data.orderCode !== request.orderCode || data.amount !== request.amount ||
      !isText(data.id, 32, 32) || !LINK_ID.test(data.id) ||
      !isInteger(data.amountPaid) || !isInteger(data.amountRemaining) ||
      !isText(data.status) || !STATUSES.includes(data.status) ||
      !Array.isArray(data.transactions) || !data.transactions.every((entry: unknown) => this.isTransaction(entry))
    ) {
      throw new BadGatewayException('Thông tin đối soát payOS không khớp đơn hàng.');
    }
    return {
      orderCode: request.orderCode,
      paymentLinkId: data.id,
      amount: request.amount,
      amountPaid: data.amountPaid,
      amountRemaining: data.amountRemaining,
      status: data.status as PayosPaymentStatus,
      transactions: data.transactions as PayosTransaction[],
    };
  }

  verifyNotification(body: unknown): PayosNotification {
    const configuration = this.getConfiguration();
    if (!isRecord(body) || !isRecord(body.data) || !this.matchesSignature(body.data, body.signature, configuration.checksumKey)) {
      throw new UnauthorizedException('Chữ ký thông báo payOS không hợp lệ.');
    }
    const data = body.data;
    if (
      !this.isTransaction(data) || !isInteger(data.orderCode, 1) ||
      data.currency !== 'VND' || !isText(data.paymentLinkId, 32, 32) || !LINK_ID.test(data.paymentLinkId) ||
      !isText(data.code, 10, 1) || !isText(data.desc, 1000)
    ) {
      throw new BadRequestException('Dữ liệu thông báo payOS không hợp lệ.');
    }
    // Deliberately exclude unsigned envelope fields and bank/customer PII.
    return {
      orderCode: data.orderCode,
      amount: data.amount,
      description: data.description,
      accountNumber: data.accountNumber,
      reference: data.reference,
      transactionDateTime: data.transactionDateTime,
      currency: data.currency,
      paymentLinkId: data.paymentLinkId,
      code: data.code,
      desc: data.desc,
    };
  }

  private async recoverPayment(request: PayosCreateRequest): Promise<PayosCreateResult> {
    const payment = await this.readPayment(request);
    return {
      // GET does not include QR content. Keep the existing hosted checkout usable.
      gatewayUrl: `https://pay.payos.vn/web/${payment.paymentLinkId}`,
      paymentLinkId: payment.paymentLinkId,
      description: request.description,
      status: payment.status,
    };
  }

  private async sendRequest(url: string, configuration: PayosConfiguration, body?: Record<string, unknown>): Promise<unknown> {
    try {
      const response = await fetch(url, {
        method: body ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': configuration.clientId,
          'x-api-key': configuration.apiKey,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(body ? 20_000 : 10_000),
        redirect: 'error',
      });
      if (!response.ok) throw new Error('payOS HTTP error.');
      return await response.json();
    } catch {
      throw new BadGatewayException('Chưa kết nối được payOS. Vui lòng thử lại trên đơn hàng này.');
    }
  }

  private verifiedResponse(payload: unknown, configuration: PayosConfiguration, allowNotFound = false): Record<string, unknown> {
    if (allowNotFound && isRecord(payload) && payload.code === '101') {
      throw new PayosPaymentNotFoundException();
    }
    if (!isRecord(payload) || payload.code !== '00' || !isRecord(payload.data)) {
      throw new BadGatewayException('payOS chưa tìm thấy thông tin thanh toán. Vui lòng thử lại trên đơn hàng này.');
    }
    if (!this.matchesSignature(payload.data, payload.signature, configuration.checksumKey)) {
      throw new BadGatewayException('Chữ ký phản hồi payOS không hợp lệ.');
    }
    return payload.data;
  }

  private matchesSignature(data: Record<string, unknown>, signature: unknown, checksumKey: string): boolean {
    if (typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return false;
    try {
      const expected = Buffer.from(this.sign(signatureContent(data), checksumKey), 'hex');
      return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
    } catch {
      return false;
    }
  }

  private sign(content: string, checksumKey: string): string {
    return createHmac('sha256', checksumKey).update(content).digest('hex');
  }

  private isGatewayUrl(value: string, paymentLinkId: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && url.hostname === 'pay.payos.vn' &&
        !url.port && !url.username && !url.password && !url.hash &&
        url.pathname === `/web/${paymentLinkId}`;
    } catch {
      return false;
    }
  }

  private isTransaction(value: unknown): value is PayosTransaction & Record<string, unknown> {
    return isRecord(value) && isInteger(value.amount) &&
      isText(value.reference, 200, 1) && isText(value.accountNumber, 100, 1) &&
      isText(value.description, 1000) && isText(value.transactionDateTime, 100, 1);
  }

  private assertRequest(request: PayosCreateRequest): PayosConfiguration {
    const configuration = this.getConfiguration();
    this.assertAmount(request.amount);
    if (
      request.clientId !== configuration.clientId || !isInteger(request.orderCode, 1) ||
      !isText(request.description, 9, 1) || !/^[A-Z0-9]+$/.test(request.description) ||
      !isText(request.returnUrl, 2048, 1) || !isWebUrl(request.returnUrl) ||
      !isText(request.cancelUrl, 2048, 1) || !isWebUrl(request.cancelUrl) ||
      !isInteger(request.expiredAt, 1) || request.expiredAt > 2_147_483_647
    ) {
      throw new BadRequestException('Cấu hình payOS không khớp yêu cầu đã lưu của đơn hàng.');
    }
    return configuration;
  }

  private assertAmount(amount: number): void {
    if (!isInteger(amount, 1)) throw new BadRequestException('Số tiền payOS phải là số nguyên VND lớn hơn 0.');
  }

  private getConfiguration(): PayosConfiguration {
    const configuration = {
      clientId: this.configService.get<string>('payment.payos.clientId')?.trim() ?? '',
      apiKey: this.configService.get<string>('payment.payos.apiKey')?.trim() ?? '',
      checksumKey: this.configService.get<string>('payment.payos.checksumKey')?.trim() ?? '',
      expiryMinutes: this.configService.get<number>('payment.payos.expiryMinutes') ?? 30,
    };
    if (
      !configuration.clientId || !configuration.apiKey || !configuration.checksumKey ||
      !isInteger(configuration.expiryMinutes, 5) || configuration.expiryMinutes > 1440
    ) {
      throw new BadRequestException('payOS chưa được cấu hình đầy đủ trên máy chủ.');
    }
    return configuration;
  }
}
