import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { OrderStatus, PaymentMethod, ShippingMethod } from '../common/enums/commerce.enum';
import { PAYMENT_DEMO_PRODUCT_SKU, PAYMENT_DEMO_VARIANT_SKU } from '../demo/payment-demo.constants';

interface PasswordResetMailInput {
  to: string;
  fullName: string;
  resetUrl: string;
}

export interface OrderMailItem {
  name: string;
  productSku?: string;
  sku?: string;
  color?: string;
  size?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderMailDetails {
  id?: string;
  to: string;
  fullName: string;
  orderCode: string;
  total: number;
  createdAt?: Date;
  paidAt?: Date;
  paymentMethod?: PaymentMethod;
  subtotal?: number;
  discount?: number;
  shippingFee?: number;
  shippingMethod?: ShippingMethod;
  orderStatus?: OrderStatus;
  voucher?: { code: string };
  note?: string;
  items?: OrderMailItem[];
  shippingAddress?: {
    recipientName: string;
    phone: string;
    province: string;
    district?: string;
    ward: string;
    addressLine: string;
    note?: string;
  };
}

export interface OrderConfirmationMailInput extends OrderMailDetails {
  paymentMethod: PaymentMethod;
}

export type PaymentConfirmationMailInput = OrderMailDetails;

interface ServiceBookingConfirmationMailInput {
  to: string;
  fullName: string;
  bookingCode: string;
  serviceType: string;
  preferredDate: Date;
  preferredTimeSlot: string;
}

interface ServiceBookingStatusMailInput
  extends ServiceBookingConfirmationMailInput {
  status: string;
  note?: string;
}

interface ProductQuestionAnswerMailInput {
  to: string;
  fullName: string;
  productName: string;
  question: string;
  answer: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;
  private readonly previewMode: boolean;
  private readonly hasSmtpConfiguration: boolean;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('mail.host');
    const user = this.configService.get<string>('mail.user');
    const password = this.configService.get<string>('mail.password');

    this.from = this.configService.getOrThrow<string>('mail.from');
    this.previewMode = this.configService.getOrThrow<boolean>('mail.previewMode');
    this.hasSmtpConfiguration = Boolean(host && user && password);

    if (!this.previewMode && !this.hasSmtpConfiguration) {
      throw new Error(
        'SMTP_HOST, SMTP_USER, and SMTP_PASSWORD are required when mail preview mode is disabled.',
      );
    }

    this.transporter = !this.previewMode
      ? nodemailer.createTransport({
          host,
          port: this.configService.getOrThrow<number>('mail.port'),
          secure: this.configService.getOrThrow<boolean>('mail.secure'),
          auth: { user, pass: password },
        })
      : nodemailer.createTransport({ jsonTransport: true });
  }

  async sendPasswordResetEmail(input: PasswordResetMailInput): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: input.to,
      subject: 'Reset your XeDap22h password',
      text: [
        `Hello ${input.fullName},`,
        '',
        'Use the link below to reset your password:',
        input.resetUrl,
        '',
        'If you did not request this, you can safely ignore this email.',
      ].join('\n'),
      html: `
        <p>Hello ${this.escapeHtml(input.fullName)},</p>
        <p>Use the link below to reset your XeDap22h password:</p>
        <p><a href="${input.resetUrl}">Reset password</a></p>
        <p>If you did not request this, you can safely ignore this email.</p>
      `,
    });

    if (this.previewMode) {
      this.logger.warn(
        `Development password-reset URL for ${input.to}: ${input.resetUrl}`,
      );
    }
  }

  async sendOrderConfirmationEmail(
    input: OrderConfirmationMailInput,
  ): Promise<void> {
    const content = this.renderOrderEmail(input, false);
    await this.transporter.sendMail({
      from: this.from,
      to: input.to,
      subject: `XeDap22h - Đã nhận đơn hàng ${input.orderCode}`,
      ...content,
    });

    if (this.previewMode) {
      this.logger.warn(
        `Development order confirmation generated for ${input.to}: ${input.orderCode}`,
      );
    }
  }

  async sendPaymentConfirmationEmail(
    input: PaymentConfirmationMailInput,
  ): Promise<void> {
    const content = this.renderOrderEmail(input, true);
    await this.transporter.sendMail({
      from: this.from,
      to: input.to,
      subject: `XeDap22h - Đã thanh toán đơn ${input.orderCode}`,
      ...content,
    });

    if (this.previewMode) {
      this.logger.warn(
        `Development payment confirmation generated for ${input.to}: ${input.orderCode}`,
      );
    }
  }

  async sendServiceBookingConfirmationEmail(
    input: ServiceBookingConfirmationMailInput,
  ): Promise<void> {
    const appointment = this.formatAppointment(
      input.preferredDate,
      input.preferredTimeSlot,
    );

    await this.transporter.sendMail({
      from: this.from,
      to: input.to,
      subject: `XeDap22h service appointment ${input.bookingCode} received`,
      text: [
        `Hello ${input.fullName},`,
        '',
        `We received your ${input.serviceType.toLowerCase()} booking ${input.bookingCode}.`,
        `Preferred appointment: ${appointment}.`,
        'Our service team will confirm the appointment shortly.',
      ].join('\n'),
      html: `
        <p>Hello ${this.escapeHtml(input.fullName)},</p>
        <p>We received your <strong>${this.escapeHtml(
          input.serviceType.toLowerCase(),
        )}</strong> booking <strong>${this.escapeHtml(input.bookingCode)}</strong>.</p>
        <p>Preferred appointment: <strong>${this.escapeHtml(appointment)}</strong>.</p>
        <p>Our service team will confirm the appointment shortly.</p>
      `,
    });

    if (this.previewMode) {
      this.logger.warn(
        `Development service-booking confirmation generated for ${input.to}: ${input.bookingCode}`,
      );
    }
  }

  async sendServiceBookingStatusEmail(
    input: ServiceBookingStatusMailInput,
  ): Promise<void> {
    const appointment = this.formatAppointment(
      input.preferredDate,
      input.preferredTimeSlot,
    );

    await this.transporter.sendMail({
      from: this.from,
      to: input.to,
      subject: `XeDap22h service appointment ${input.bookingCode} updated`,
      text: [
        `Hello ${input.fullName},`,
        '',
        `Your service booking ${input.bookingCode} is now ${input.status.toLowerCase()}.`,
        `Preferred appointment: ${appointment}.`,
        ...(input.note ? [`Note: ${input.note}`] : []),
      ].join('\n'),
      html: `
        <p>Hello ${this.escapeHtml(input.fullName)},</p>
        <p>Your service booking <strong>${this.escapeHtml(
          input.bookingCode,
        )}</strong> is now <strong>${this.escapeHtml(
          input.status.toLowerCase(),
        )}</strong>.</p>
        <p>Preferred appointment: <strong>${this.escapeHtml(appointment)}</strong>.</p>
        ${input.note ? `<p>Note: ${this.escapeHtml(input.note)}</p>` : ''}
      `,
    });

    if (this.previewMode) {
      this.logger.warn(
        `Development service-booking status email generated for ${input.to}: ${input.bookingCode}`,
      );
    }
  }

  async sendProductQuestionAnswerEmail(
    input: ProductQuestionAnswerMailInput,
  ): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: input.to,
      subject: `XeDap22h answered your question about ${input.productName}`,
      text: [
        `Hello ${input.fullName},`,
        '',
        `Your question about ${input.productName} has been answered.`,
        `Question: ${input.question}`,
        `Answer: ${input.answer}`,
      ].join('\n'),
      html: `
        <p>Hello ${this.escapeHtml(input.fullName)},</p>
        <p>Your question about <strong>${this.escapeHtml(
          input.productName,
        )}</strong> has been answered.</p>
        <p><strong>Question:</strong> ${this.escapeHtml(input.question)}</p>
        <p><strong>Answer:</strong> ${this.escapeHtml(input.answer)}</p>
      `,
    });

    if (this.previewMode) {
      this.logger.warn(
        `Development product-question answer generated for ${input.to}: ${input.productName}`,
      );
    }
  }

  private renderOrderEmail(
    input: OrderMailDetails,
    paid: boolean,
  ): { text: string; html: string } {
    const brand = 'Cửa hàng xe đạp 22h';
    const method =
      input.paymentMethod === PaymentMethod.COD
        ? 'Thanh toán khi nhận hàng (COD)'
        : 'Chuyển khoản qua mã QR';
    const paymentStatus = paid
      ? 'Đã thanh toán'
      : input.paymentMethod === PaymentMethod.COD
        ? 'Chưa thanh toán – thanh toán khi nhận hàng'
        : 'Đang chờ thanh toán qua mã QR/chuyển khoản';
    const title = paid ? 'Thanh toán thành công' : 'Đặt hàng thành công';
    const introduction = `Bạn đã đặt hàng thành công mã đơn hàng #${input.orderCode}.${
      paid ? ` ${brand} đã xác nhận thanh toán cho đơn hàng này.` : ''
    }`;
    const discount = input.discount ?? 0;
    const shippingFee = input.shippingFee ?? 0;
    const subtotal = input.subtotal ?? input.total + discount - shippingFee;
    const demoOnly = Boolean(input.items?.length && input.items.every((item) =>
      item.productSku === PAYMENT_DEMO_PRODUCT_SKU && item.sku === PAYMENT_DEMO_VARIANT_SKU));
    const deliveryEstimate = this.orderDeliveryEstimate(input, paid, demoOnly);
    const shippingMethod = demoOnly ? 'Đơn demo, không giao hàng thực tế'
      : input.shippingMethod === ShippingMethod.STANDARD ? 'Giao tiêu chuẩn (2–4 ngày)'
        : input.shippingMethod === ShippingMethod.EXPRESS ? 'Giao nhanh (1–2 ngày)' : 'Chờ cửa hàng xác nhận';
    const statuses: Record<OrderStatus, string> = {
      PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', PACKING: 'Đang chuẩn bị hàng',
      SHIPPING: 'Đang giao hàng', DELIVERED: 'Đã giao hàng', CANCELLED: 'Đã hủy',
    };
    const orderUrl = this.orderDetailsUrl(input.id);
    const summary: Array<[string, string]> = [
      ['Tiền hàng', this.formatCurrency(subtotal)],
      [input.voucher?.code ? `Giảm giá (${input.voucher.code})` : 'Giảm giá', discount > 0 ? `−${this.formatCurrency(discount)}` : this.formatCurrency(0)],
      ['Phí giao hàng', shippingFee === 0 ? `${this.formatCurrency(0)} (Miễn phí)` : this.formatCurrency(shippingFee)],
      ['Tổng giá trị đơn hàng', this.formatCurrency(input.total)],
      [paid ? 'Tổng đã thanh toán' : 'Tổng thanh toán khi nhận hàng', this.formatCurrency(input.total)],
      ...(paid ? [['Còn phải thanh toán', this.formatCurrency(0)] as [string, string]] : []),
    ];
    if (!paid && input.paymentMethod !== PaymentMethod.COD) {
      summary[4][0] = 'Tổng cần thanh toán';
    }
    const items = input.items ?? [];
    const facts: Array<[string, string]> = [
      ['Mã đơn hàng', input.orderCode],
      ...(input.createdAt
        ? ([['Thời gian đặt', this.formatOrderDate(input.createdAt)]] as Array<[string, string]>)
        : []),
      ...(items.length
        ? ([['Sản phẩm', items.map((item) => `${item.name} (SL: ${item.quantity})`).join('; ')]] as Array<[string, string]>)
        : []),
      ['Tổng thanh toán', this.formatCurrency(input.total)],
      ['Phương thức thanh toán', method],
      ['Dự kiến giao hàng', deliveryEstimate],
      ...(paid && input.paidAt
        ? ([['Thời gian thanh toán', this.formatOrderDate(input.paidAt)]] as Array<[string, string]>)
        : []),
      ['Thanh toán', paymentStatus],
      ['Trạng thái đơn hàng', input.orderStatus ? statuses[input.orderStatus] : 'Đã tiếp nhận'],
    ];
    const address = input.shippingAddress;
    const addressLines = address
      ? [
          address.recipientName,
          `Số điện thoại: ${address.phone}`,
          `Email nhận thông báo: ${input.to}`,
          [address.addressLine, address.ward, address.district, address.province]
            .filter(Boolean)
            .join(', '),
        ]
      : [];
    const notes: Array<[string, string]> = [
      ...(input.note?.trim() ? [['Ghi chú đơn hàng', input.note.trim()] as [string, string]] : []),
      ...(address?.note?.trim() ? [['Lưu ý giao hàng', address.note.trim()] as [string, string]] : []),
    ];
    const deliveryNotice = demoOnly ? 'Đơn này dùng để thử chức năng đặt hàng và thanh toán; không có hàng được giao thực tế.'
      : 'Khoảng ngày nhận hàng là dự kiến theo ngày lịch, có tính cuối tuần. Cửa hàng sẽ liên hệ nếu lịch giao thay đổi.';
    const demoCod = demoOnly && !paid && input.paymentMethod === PaymentMethod.COD;
    if (demoCod) summary[4][0] = 'Giá trị đơn COD demo';
    const paymentNotice = paid
      ? 'Cửa hàng đã ghi nhận thanh toán. Bạn không cần thanh toán lại số tiền này khi nhận hàng.'
      : demoCod ? 'Đơn COD dùng để thử hệ thống; không giao hàng và không thu tiền thực tế.'
        : input.paymentMethod === PaymentMethod.COD ? 'Đơn COD đã được tiếp nhận. Bạn thanh toán cho người giao hàng khi nhận đơn.'
          : 'Đơn hàng đang chờ thanh toán. Vui lòng hoàn tất thanh toán trên website.';
    const closing = demoOnly
      ? 'Cảm ơn bạn đã trải nghiệm Xe Đạp 22h! Đây là đơn demo, không giao hàng thực tế.'
      : 'Cảm ơn bạn đã mua sắm tại Xe Đạp 22h! Chúng tôi sẽ sớm liên hệ để xác nhận và giao hàng đến bạn.';
    const text = [
      brand.toLocaleUpperCase('vi-VN'),
      title,
      '',
      `Xin chào ${input.fullName},`,
      introduction,
      '',
      ...facts.flatMap(([label, value]) => [`${label}: ${value}`, '']),
      paymentNotice,
      ...(items.length
        ? [
            '',
            'CHI TIẾT SẢN PHẨM',
            ...items.flatMap((item, index) => [
              `${index + 1}. ${item.name}`,
              ...this.itemVariantLabels(item),
              `Số lượng: ${item.quantity} | Đơn giá: ${this.formatCurrency(item.unitPrice)} | Thành tiền: ${this.formatCurrency(item.totalPrice)}`,
            ]),
          ]
        : []),
      '',
      ...summary.map(([label, value]) => `${label}: ${value}`),
      ...(addressLines.length ? ['', 'THÔNG TIN GIAO HÀNG', ...addressLines] : []),
      `Hình thức giao hàng: ${shippingMethod}`,
      deliveryNotice,
      ...notes.map(([label, value]) => `${label}: ${value}`),
      '',
      closing,
      ...(orderUrl ? ['', `Xem chi tiết đơn hàng: ${orderUrl}`, 'Vui lòng đăng nhập tài khoản đã đặt hàng để xem đơn.'] : []),
      '',
      'Đây là email xác nhận tự động từ Cửa hàng xe đạp 22h.',
    ].join('\n');
    const html = `<!doctype html>
<html lang="vi">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<style>@media only screen and (max-width:480px){.email-pad{padding:20px 16px!important}.detail-table th,.detail-table td{padding:10px 5px!important;font-size:12px!important}.email-title{font-size:24px!important}}</style></head>
<body style="margin:0;padding:0;background:#f1f5f9;color:#172b4d;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;-webkit-text-size-adjust:100%;">
  <div style="display:none;font-size:1px;line-height:1px;color:#f1f5f9;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${this.escapeHtml(`${input.orderCode} · ${paid ? 'Đã thanh toán' : 'Đã tiếp nhận đơn'} · ${this.formatCurrency(input.total)}`)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 8px;table-layout:fixed;"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;table-layout:fixed;overflow-wrap:anywhere;background:#ffffff;border:1px solid #dbe3ee;border-radius:12px;overflow:hidden;">
      <tr><td class="email-pad" style="padding:28px 28px 24px;background:#153b70;color:#ffffff;">
        <p style="margin:0 0 20px;font-size:14px;font-weight:bold;letter-spacing:1px;">CỬA HÀNG XE ĐẠP 22H</p>
        <p style="margin:0 0 6px;color:#d5e3f7;font-size:11px;letter-spacing:1px;">XÁC NHẬN ĐƠN HÀNG</p>
        <h1 class="email-title" style="margin:0;font-size:28px;line-height:1.3;">${title}</h1>
      </td></tr>
      <tr><td class="email-pad" style="padding:24px 28px;">
        <p style="margin:0 0 12px;">Xin chào <strong>${this.escapeHtml(input.fullName)}</strong>,</p>
        <p style="margin:0 0 20px;">${this.escapeHtml(introduction)}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-collapse:separate;background:${paid ? '#ecfdf5' : '#fffbeb'};border:1px solid ${paid ? '#a7f3d0' : '#fde68a'};border-radius:8px;"><tr><td style="padding:16px 18px;">
          <p style="margin:0 0 2px;font-size:12px;color:${paid ? '#065f46' : '#854d0e'};">${paid ? 'SỐ TIỀN ĐÃ THANH TOÁN' : demoCod ? 'GIÁ TRỊ ĐƠN COD DEMO' : input.paymentMethod === PaymentMethod.COD ? 'THANH TOÁN KHI NHẬN HÀNG' : 'SỐ TIỀN CẦN THANH TOÁN'}</p>
          <p style="margin:0;font-size:28px;line-height:1.3;font-weight:bold;color:${paid ? '#065f46' : '#854d0e'};">${this.escapeHtml(this.formatCurrency(input.total))}</p>
          <p style="margin:8px 0 0;color:${paid ? '#065f46' : '#854d0e'};font-size:13px;">${this.escapeHtml(paymentNotice)}</p>
        </td></tr></table>
        <h2 style="margin:0 0 10px;font-size:17px;">Thông tin đơn hàng</h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;border-collapse:collapse;border:1px solid #dbe3ee;font-size:14px;">
          ${facts.map(([label, value]) => `<tr><th scope="row" style="width:38%;padding:10px;text-align:left;vertical-align:top;background:#f8fafc;border-bottom:1px solid #dbe3ee;color:#425570;font-weight:normal;">${this.escapeHtml(label)}</th><td style="padding:10px;border-bottom:1px solid #dbe3ee;overflow-wrap:anywhere;">${this.escapeHtml(value)}</td></tr>`).join('')}
        </table>
        ${items.length ? `<h2 style="margin:24px 0 10px;font-size:17px;">Chi tiết sản phẩm</h2>
        <table class="detail-table" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;table-layout:fixed;">
          <thead><tr style="background:#edf3fc;"><th scope="col" style="width:44%;padding:10px 6px;text-align:left;border:1px solid #dbe3ee;">Sản phẩm</th><th scope="col" style="width:25%;padding:10px 6px;text-align:right;border:1px solid #dbe3ee;">SL / Đơn giá</th><th scope="col" style="width:31%;padding:10px 6px;text-align:right;border:1px solid #dbe3ee;">Thành tiền</th></tr></thead>
          <tbody>${items.map((item) => `<tr><td style="padding:12px 6px;vertical-align:top;border:1px solid #dbe3ee;overflow-wrap:anywhere;"><strong>${this.escapeHtml(item.name)}</strong>${this.itemVariantLabels(item).map((label) => `<br><span style="color:#52627a;">${this.escapeHtml(label)}</span>`).join('')}</td><td style="padding:12px 6px;text-align:right;vertical-align:top;border:1px solid #dbe3ee;overflow-wrap:anywhere;">${this.escapeHtml(String(item.quantity))} ×<br>${this.escapeHtml(this.formatCurrency(item.unitPrice))}</td><td style="padding:12px 6px;text-align:right;vertical-align:top;border:1px solid #dbe3ee;font-weight:bold;overflow-wrap:anywhere;">${this.escapeHtml(this.formatCurrency(item.totalPrice))}</td></tr>`).join('')}</tbody>
        </table>` : ''}
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;table-layout:fixed;border-collapse:collapse;font-size:14px;">
          ${summary.map(([label, value], index) => `<tr><th scope="row" style="padding:10px;text-align:left;border-bottom:1px solid #dbe3ee;font-weight:${index >= 3 ? 'bold' : 'normal'};${index >= 3 ? 'background:#edf3fc;color:#153b70;' : ''}">${this.escapeHtml(label)}</th><td style="width:45%;padding:10px;text-align:right;border-bottom:1px solid #dbe3ee;font-weight:${index >= 3 ? 'bold' : 'normal'};${index >= 3 ? 'background:#edf3fc;color:#153b70;' : ''}">${this.escapeHtml(value)}</td></tr>`).join('')}
        </table>
        ${addressLines.length ? `<h2 style="margin:24px 0 10px;font-size:17px;">Thông tin giao hàng</h2><p style="margin:0;padding:14px;background:#f8fafc;border:1px solid #dbe3ee;border-radius:6px;overflow-wrap:anywhere;">${addressLines.map((line) => this.escapeHtml(line)).join('<br>')}</p>` : ''}
        <p style="margin:12px 0 0;"><strong>Hình thức giao hàng:</strong> ${this.escapeHtml(shippingMethod)}</p>
        <p style="margin:6px 0 0;font-size:12px;color:#52627a;">${this.escapeHtml(deliveryNotice)}</p>
        ${notes.length ? `<h2 style="margin:24px 0 10px;font-size:17px;">Ghi chú</h2>${notes.map(([label, value]) => `<p style="margin:0 0 8px;overflow-wrap:anywhere;"><strong>${this.escapeHtml(label)}:</strong><br>${this.escapeHtml(value).replace(/\r?\n/g, '<br>')}</p>`).join('')}` : ''}
        <p style="margin:24px 0 0;">${this.escapeHtml(closing)}</p>
        ${orderUrl ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0 0;"><tr><td bgcolor="#153b70" style="border-radius:6px;text-align:center;"><a href="${this.escapeHtml(orderUrl)}" style="display:inline-block;padding:12px 22px;border:1px solid #153b70;border-radius:6px;color:#ffffff;text-decoration:none;font-weight:bold;">Xem chi tiết đơn hàng</a></td></tr></table><p style="margin:8px 0 0;font-size:12px;color:#52627a;">Vui lòng đăng nhập tài khoản đã đặt hàng để xem đơn.</p>` : ''}
      </td></tr>
      <tr><td class="email-pad" style="padding:16px 28px;background:#f8fafc;border-top:1px solid #dbe3ee;color:#52627a;font-size:12px;">Đây là email xác nhận tự động từ Cửa hàng xe đạp 22h.<br>Vui lòng giữ lại mã đơn hàng để thuận tiện khi cần hỗ trợ. Email này không thay thế hóa đơn giá trị gia tăng.</td></tr>
    </table>
  </td></tr></table>
</body></html>`;
    return { text, html };
  }

  private orderDetailsUrl(id?: string): string | undefined {
    const base = this.configService.get<string>('app.frontendUrl');
    if (!base || !id || !/^[a-f\d]{24}$/i.test(id)) return undefined;
    try {
      const url = new URL(base);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return undefined;
      url.pathname = `${url.pathname.replace(/\/$/, '')}/account/orders/${id}`;
      url.search = '';
      url.hash = '';
      return url.toString();
    } catch {
      return undefined;
    }
  }

  private orderDeliveryEstimate(input: OrderMailDetails, paid: boolean, demoOnly: boolean): string {
    if (demoOnly) return 'Đơn demo, không giao hàng thực tế';
    const anchor = paid ? input.paidAt : input.createdAt;
    const days = input.shippingMethod === ShippingMethod.STANDARD ? [2, 4]
      : input.shippingMethod === ShippingMethod.EXPRESS ? [1, 2] : undefined;
    if (!(anchor instanceof Date) || !Number.isFinite(anchor.getTime()) || !days) return 'Chờ cửa hàng xác nhận';
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(anchor).map(({ type, value }) => [type, value]));
    const formatter = new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit',
    });
    return days.map((day) => formatter.format(new Date(Date.UTC(
      Number(parts.year), Number(parts.month) - 1, Number(parts.day) + day,
    )))).join(' – ');
  }

  private itemVariantLabels(item: OrderMailItem): string[] {
    return [
      ...(item.sku ? [`Mã sản phẩm (SKU): ${item.sku}`] : []),
      ...(item.color ? [`Màu: ${item.color}`] : []),
      ...(item.size ? [`Kích cỡ: ${item.size}`] : []),
    ];
  }

  private formatOrderDate(date: Date): string {
    if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return 'Chưa ghi nhận';
    const formatted = new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(date);
    return `${formatted} (giờ Việt Nam)`;
  }

  private formatAppointment(date: Date, timeSlot: string): string {
    const formattedDate = new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'full',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(date);

    return `${formattedDate}, ${timeSlot}`;
  }

  private formatCurrency(value: number): string {
    return `${new Intl.NumberFormat('vi-VN', {
      maximumFractionDigits: 0,
    }).format(value)} VNĐ`;
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>'"]/g, (character) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      };

      return entities[character];
    });
  }
}
