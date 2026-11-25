import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { PaymentMethod, PaymentStatus } from '../../common/enums/commerce.enum';
import {
  PaymentInitiationInput,
  PaymentInitiationResult,
  PaymentProvider,
} from './payment-provider.interface';
import {
  MomoCreateRequest,
  MomoCreateResult,
  MomoEnvironment,
  MomoNotification,
} from './momo-payment.types';

export const MOMO_PAYMENT_PROVIDER = 'MOMO';
const HOSTS: Record<MomoEnvironment, string> = {
  sandbox: 'test-payment.momo.vn',
  production: 'payment.momo.vn',
};

interface MomoConfiguration {
  environment: MomoEnvironment;
  partnerCode: string;
  accessKey: string;
  secretKey: string;
  ipnUrl: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A public HTTPS endpoint is needed for the server-to-server callback. */
export function isPublicMomoIpnUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return (
      url.protocol === 'https:' &&
      !url.username && !url.password && !url.search && !url.hash &&
      url.pathname === '/api/v1/payments/momo/ipn' &&
      hostname.includes('.') && !hostname.endsWith('.') &&
      !hostname.endsWith('.localhost') && !hostname.endsWith('.local') &&
      !hostname.endsWith('.internal') &&
      // Use the public DNS name registered for the merchant callback, not LAN IPs.
      !/^[\d.]+$/.test(hostname) && !hostname.includes(':')
    );
  } catch {
    return false;
  }
}

@Injectable()
export class MomoPaymentProvider implements PaymentProvider {
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

  getEnvironment(): MomoEnvironment {
    return this.configService.get<MomoEnvironment>('payment.momo.environment') ?? 'sandbox';
  }

  /** This method runs inside the order transaction: never perform network I/O. */
  async initiate(input: PaymentInitiationInput): Promise<PaymentInitiationResult> {
    const configuration = this.getConfiguration();
    this.assertAmount(input.amount);
    const paymentReference = `MOMO-${randomUUID()}`;
    const url = new URL('/payment/qr', this.configService.getOrThrow<string>('app.frontendUrl'));
    url.searchParams.set('orderCode', input.orderCode);
    url.searchParams.set('paymentRef', paymentReference);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      throw new BadRequestException('Invalid frontend URL for MoMo payment.');
    }

    return {
      provider: MOMO_PAYMENT_PROVIDER,
      paymentStatus: PaymentStatus.UNPAID,
      paymentReference,
      paymentUrl: url.toString(),
      momoRequest: {
        environment: configuration.environment,
        partnerCode: configuration.partnerCode,
        requestId: paymentReference,
        orderId: paymentReference,
        amount: input.amount,
        orderInfo: `Thanh toan don hang ${input.orderCode}`.slice(0, 255),
        redirectUrl: url.toString(),
        ipnUrl: configuration.ipnUrl,
        extraData: '',
        requestType: 'captureWallet',
        autoCapture: true,
        lang: 'vi',
      },
    };
  }

  canConfirmFromCustomer(): boolean {
    return false;
  }

  /** Call after the order commit. The persisted request must be reused on retry. */
  async createPayment(request: MomoCreateRequest): Promise<MomoCreateResult> {
    const configuration = this.getConfiguration();
    this.assertAmount(request.amount);
    if (
      request.environment !== configuration.environment ||
      request.partnerCode !== configuration.partnerCode ||
      !request.requestId || request.requestId.length > 50 ||
      request.requestId !== request.orderId ||
      request.requestType !== 'captureWallet' || request.autoCapture !== true ||
      request.lang !== 'vi' || request.extraData !== '' ||
      !request.orderInfo || request.orderInfo.length > 255 ||
      !isPublicMomoIpnUrl(request.ipnUrl)
    ) {
      throw new BadRequestException('MoMo payment configuration no longer matches this order.');
    }

    const rawSignature = [
      `accessKey=${configuration.accessKey}`,
      `amount=${request.amount}`,
      `extraData=${request.extraData}`,
      `ipnUrl=${request.ipnUrl}`,
      `orderId=${request.orderId}`,
      `orderInfo=${request.orderInfo}`,
      `partnerCode=${request.partnerCode}`,
      `redirectUrl=${request.redirectUrl}`,
      `requestId=${request.requestId}`,
      `requestType=${request.requestType}`,
    ].join('&');
    // Explicit fields also prevent Mongoose subdocument internals entering the request.
    const body = {
      partnerCode: request.partnerCode,
      requestId: request.requestId,
      orderId: request.orderId,
      amount: request.amount,
      orderInfo: request.orderInfo,
      redirectUrl: request.redirectUrl,
      ipnUrl: request.ipnUrl,
      extraData: request.extraData,
      requestType: request.requestType,
      autoCapture: request.autoCapture,
      lang: request.lang,
      signature: this.sign(rawSignature, configuration.secretKey),
    };
    let payload: unknown;
    try {
      const response = await fetch(`https://${HOSTS[request.environment]}/v2/gateway/api/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(35_000),
        redirect: 'error',
      });
      if (!response.ok) {
        throw new Error('MoMo HTTP error.');
      }
      payload = await response.json();
    } catch {
      throw new BadGatewayException('Không thể kết nối MoMo. Vui lòng thử lại trên đơn hàng này.');
    }

    if (
      !isRecord(payload) || payload.partnerCode !== request.partnerCode ||
      payload.requestId !== request.requestId || payload.orderId !== request.orderId ||
      payload.amount !== request.amount || !Number.isSafeInteger(payload.resultCode)
    ) {
      throw new BadGatewayException('Phản hồi tạo thanh toán MoMo không khớp đơn hàng.');
    }
    if (payload.resultCode !== 0) {
      throw new BadGatewayException(`MoMo chưa tạo được thanh toán (mã ${String(payload.resultCode)}). Vui lòng kiểm tra lại.`);
    }
    if (typeof payload.payUrl !== 'string' || !this.isAllowedGatewayUrl(payload.payUrl, request.environment)) {
      throw new BadGatewayException('MoMo trả về địa chỉ thanh toán không hợp lệ.');
    }
    // Some merchant products omit this optional response signature. Validate if supplied.
    if (payload.signature !== undefined) {
      const rawResponseSignature = [
        `accessKey=${configuration.accessKey}`, `amount=${payload.amount}`,
        `orderId=${payload.orderId}`, `partnerCode=${payload.partnerCode}`,
        `payUrl=${payload.payUrl}`, `requestId=${payload.requestId}`,
        `responseTime=${String(payload.responseTime)}`, `resultCode=${String(payload.resultCode)}`,
      ].join('&');
      if (
        !Number.isSafeInteger(payload.responseTime) ||
        !this.matchesSignature(rawResponseSignature, payload.signature, configuration.secretKey)
      ) {
        throw new BadGatewayException('Chữ ký phản hồi MoMo không hợp lệ.');
      }
    }
    if (payload.qrCodeUrl !== undefined && (
      typeof payload.qrCodeUrl !== 'string' || payload.qrCodeUrl.length > 4096
    )) {
      throw new BadGatewayException('MoMo trả về dữ liệu QR không hợp lệ.');
    }

    return {
      gatewayUrl: payload.payUrl,
      ...(payload.qrCodeUrl ? { qrPayload: payload.qrCodeUrl as string } : {}),
      environment: request.environment,
    };
  }

  verifyNotification(body: unknown): MomoNotification {
    const configuration = this.getConfiguration();
    if (!isRecord(body)) {
      throw new BadRequestException('Invalid MoMo notification.');
    }
    const strings = ['partnerCode', 'orderId', 'requestId', 'orderInfo', 'orderType', 'message', 'payType', 'extraData', 'signature'] as const;
    for (const key of strings) {
      if (typeof body[key] !== 'string' || body[key].length > 4096) {
        throw new BadRequestException('Invalid MoMo notification fields.');
      }
    }
    for (const key of ['amount', 'transId', 'resultCode', 'responseTime'] as const) {
      if (!Number.isSafeInteger(body[key]) || (body[key] as number) < 0) {
        throw new BadRequestException('Invalid MoMo notification values.');
      }
    }
    if (body.partnerCode !== configuration.partnerCode) {
      throw new UnauthorizedException('MoMo merchant does not match.');
    }
    const rawSignature = [
      `accessKey=${configuration.accessKey}`, `amount=${String(body.amount)}`,
      `extraData=${body.extraData as string}`, `message=${body.message as string}`,
      `orderId=${body.orderId as string}`, `orderInfo=${body.orderInfo as string}`,
      `orderType=${body.orderType as string}`, `partnerCode=${body.partnerCode as string}`,
      `payType=${body.payType as string}`, `requestId=${body.requestId as string}`,
      `responseTime=${String(body.responseTime)}`, `resultCode=${String(body.resultCode)}`,
      `transId=${String(body.transId)}`,
    ].join('&');
    if (!this.matchesSignature(rawSignature, body.signature, configuration.secretKey)) {
      throw new UnauthorizedException('Invalid MoMo signature.');
    }
    // Only the authenticated fields are returned; ignore optional provider extensions.
    return Object.fromEntries([
      ...strings.map((key) => [key, body[key]]),
      ...['amount', 'transId', 'resultCode', 'responseTime'].map((key) => [key, body[key]]),
    ]) as unknown as MomoNotification;
  }

  private getConfiguration(): MomoConfiguration {
    const configuration: MomoConfiguration = {
      environment: this.getEnvironment(),
      partnerCode: this.configService.get<string>('payment.momo.partnerCode') ?? '',
      accessKey: this.configService.get<string>('payment.momo.accessKey') ?? '',
      secretKey: this.configService.get<string>('payment.momo.secretKey') ?? '',
      ipnUrl: this.configService.get<string>('payment.momo.ipnUrl') ?? '',
    };
    if (
      !['sandbox', 'production'].includes(configuration.environment) ||
      !configuration.partnerCode || !configuration.accessKey || !configuration.secretKey ||
      !isPublicMomoIpnUrl(configuration.ipnUrl)
    ) {
      throw new BadRequestException('MoMo chưa được cấu hình đầy đủ trên máy chủ.');
    }
    return configuration;
  }

  private assertAmount(amount: number): void {
    if (!Number.isSafeInteger(amount) || amount < 1000 || amount > 50_000_000) {
      throw new BadRequestException('MoMo hỗ trợ số tiền từ 1.000 đến 50.000.000 đồng, không có phần thập phân.');
    }
  }

  private isAllowedGatewayUrl(value: string, environment: MomoEnvironment): boolean {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && url.hostname === HOSTS[environment] &&
        !url.username && !url.password && (!url.port || url.port === '443');
    } catch {
      return false;
    }
  }

  private sign(value: string, secretKey: string): string {
    return createHmac('sha256', secretKey).update(value).digest('hex');
  }

  private matchesSignature(value: string, signature: unknown, secretKey: string): boolean {
    if (typeof signature !== 'string' || !/^[a-f\d]{64}$/i.test(signature)) {
      return false;
    }
    return timingSafeEqual(Buffer.from(this.sign(value, secretKey), 'hex'), Buffer.from(signature, 'hex'));
  }
}
