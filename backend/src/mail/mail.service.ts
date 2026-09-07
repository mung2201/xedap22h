import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { PaymentMethod } from '../common/enums/commerce.enum';

interface PasswordResetMailInput {
  to: string;
  fullName: string;
  resetUrl: string;
}

interface OrderConfirmationMailInput {
  to: string;
  fullName: string;
  orderCode: string;
  total: number;
  paymentMethod: PaymentMethod;
}

interface PaymentConfirmationMailInput {
  to: string;
  fullName: string;
  orderCode: string;
  total: number;
}

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

    this.transporter = this.hasSmtpConfiguration
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
    const total = this.formatCurrency(input.total);
    const paymentMessage =
      input.paymentMethod === PaymentMethod.COD
        ? 'Bạn chọn thanh toán khi nhận hàng (COD).'
        : 'Đơn hàng đang chờ thanh toán qua mã QR/chuyển khoản.';

    await this.transporter.sendMail({
      from: this.from,
      to: input.to,
      subject: `XeDap22h - Đã nhận đơn hàng ${input.orderCode}`,
      text: [
        `Xin chào ${input.fullName},`,
        '',
        `XeDap22h đã nhận đơn hàng ${input.orderCode}.`,
        `Tổng thanh toán: ${total}.`,
        paymentMessage,
        'Chúng tôi sẽ gửi email khi trạng thái đơn hàng thay đổi.',
      ].join('\n'),
      html: `
        <p>Xin chào ${this.escapeHtml(input.fullName)},</p>
        <p>XeDap22h đã nhận đơn hàng <strong>${this.escapeHtml(input.orderCode)}</strong>.</p>
        <p>Tổng thanh toán: <strong>${this.escapeHtml(total)}</strong>.</p>
        <p>${this.escapeHtml(paymentMessage)}</p>
        <p>Chúng tôi sẽ gửi email khi trạng thái đơn hàng thay đổi.</p>
      `,
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
    const total = this.formatCurrency(input.total);

    await this.transporter.sendMail({
      from: this.from,
      to: input.to,
      subject: `XeDap22h - Đã thanh toán đơn ${input.orderCode}`,
      text: [
        `Xin chào ${input.fullName},`,
        '',
        `XeDap22h đã xác nhận thanh toán cho đơn hàng ${input.orderCode}.`,
        `Số tiền đã thanh toán: ${total}.`,
        'Cảm ơn bạn đã mua sắm cùng chúng tôi.',
      ].join('\n'),
      html: `
        <p>Xin chào ${this.escapeHtml(input.fullName)},</p>
        <p>XeDap22h đã xác nhận thanh toán cho đơn hàng <strong>${this.escapeHtml(
          input.orderCode,
        )}</strong>.</p>
        <p>Số tiền đã thanh toán: <strong>${this.escapeHtml(total)}</strong>.</p>
        <p>Cảm ơn bạn đã mua sắm cùng chúng tôi.</p>
      `,
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

  private formatAppointment(date: Date, timeSlot: string): string {
    const formattedDate = new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'full',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(date);

    return `${formattedDate}, ${timeSlot}`;
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
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
