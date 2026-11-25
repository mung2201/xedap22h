import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { randomBytes, randomUUID } from 'crypto';
import { Connection, Model, Types } from 'mongoose';
import { Cart } from '../carts/schemas/cart.schema';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ShippingMethod,
} from '../common/enums/commerce.enum';
import { ProductStatus } from '../common/enums/catalog.enum';
import { AuthenticatedUser } from '../common/interfaces/auth.interface';
import {
  createPaginatedResult,
  PaginatedResult,
} from '../common/interfaces/pagination.interface';
import {
  CheckoutItemSnapshot,
  CheckoutService,
} from '../checkout/checkout.service';
import { MailService } from '../mail/mail.service';
import { normalizeVietnameseMobile } from '../common/utils/phone.util';
import { PaymentsService } from '../payments/payments.service';
import { MOCK_ONLINE_PAYMENT_PROVIDER } from '../payments/providers/mock-online-payment.provider';
import { QR_TRANSFER_PAYMENT_PROVIDER } from '../payments/providers/qr-transfer-payment.provider';
import { QrPaymentInstruction } from '../payments/providers/payment-provider.interface';
import type { PayosPaymentState } from '../payments/providers/payos-payment.types';
import { Product } from '../products/schemas/product.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { VouchersService } from '../vouchers/vouchers.service';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { MyOrdersQueryDto } from './dto/my-orders-query.dto';
import { TrackOrderDto } from './dto/track-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import {
  Order,
  OrderDocument,
  OrderItem,
  OrderStatusHistoryEntry,
} from './schemas/order.schema';

export interface OrderItemResponse {
  productId: string;
  categoryId?: string;
  variantId: string;
  name: string;
  slug: string;
  productSku: string;
  sku: string;
  image: string;
  color: string;
  colorHex?: string;
  size: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderResponse {
  id: string;
  orderCode: string;
  customerInfo: {
    fullName: string;
    email: string;
    phone: string;
  };
  shippingAddress: {
    recipientName: string;
    phone: string;
    province: string;
    district: string;
    ward: string;
    addressLine: string;
    note?: string;
  };
  items: OrderItemResponse[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  voucher?: {
    code: string;
    name: string;
    discountAmount: number;
  };
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  receivedPaymentAmount?: number;
  paidAt?: Date;
  refundedAt?: Date;
  paymentProvider?: string;
  paymentReference?: string;
  paymentUrl?: string;
  orderStatus: OrderStatus;
  statusHistory: Array<{
    status: OrderStatus;
    note?: string;
    changedAt: Date;
  }>;
  note?: string;
  cancellationReason?: string;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderTrackingResponse {
  orderCode: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  shippingMethod: ShippingMethod;
  statusHistory: Array<{
    status: OrderStatus;
    changedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface OnlinePaymentResponse {
  order: OrderResponse;
  instruction: QrPaymentInstruction;
}

const ADMIN_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PACKING, OrderStatus.CANCELLED],
  [OrderStatus.PACKING]: [OrderStatus.SHIPPING, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPING]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

// Final payment failures for captureWallet. Unknown/non-final codes stay
// unpaid until a verified final notification arrives; 9000 is authorization.
const MOMO_FINAL_FAILURES = new Set([
  98, 99, 1001, 1002, 1003, 1004, 1005, 1006, 1007, 1017, 1026,
  2019, 4001, 4002, 4100,
]);

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    @InjectModel(Cart.name) private readonly cartModel: Model<Cart>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly checkoutService: CheckoutService,
    private readonly vouchersService: VouchersService,
    private readonly paymentsService: PaymentsService,
    private readonly mailService: MailService,
  ) {}

  async createFromCart(userId: string, dto: CreateOrderDto): Promise<OrderResponse> {
    const session = await this.connection.startSession();
    const orderCode = this.createOrderCode();
    let createdOrder: OrderDocument | undefined;

    try {
      await session.withTransaction(async () => {
        const prepared = await this.checkoutService.prepare(userId, dto, session);
        const user = await this.findUser(userId, session);
        const payment = await this.paymentsService.initiate(dto.paymentMethod, {
          orderCode,
          amount: prepared.total,
          customerId: userId,
        });

        if (prepared.voucher) {
          await this.vouchersService.consume(prepared.voucher.voucherId, session);
        }

        for (const item of prepared.items) {
          await this.decreaseVariantStock(item, session);
        }

        const now = new Date();
        const [order] = await this.orderModel.create(
          [
            {
              orderCode,
              user: new Types.ObjectId(userId),
              customerInfo: {
                fullName: user.fullName,
                // Preserve the email explicitly chosen during checkout as an
                // immutable order snapshot. Existing clients can omit it and
                // will safely fall back to the account email.
                email: dto.customerEmail ?? user.email,
                phone: dto.customerPhone ?? user.phone ?? prepared.shippingAddress.phone,
              },
              shippingAddress: prepared.shippingAddress,
              items: prepared.items.map((item) => this.toOrderItem(item)),
              subtotal: prepared.subtotal,
              discount: prepared.discount,
              shippingFee: prepared.shippingFee,
              total: prepared.total,
              ...(prepared.voucher
                ? {
                    voucher: {
                      voucherId: new Types.ObjectId(prepared.voucher.voucherId),
                      code: prepared.voucher.code,
                      name: prepared.voucher.name,
                      discountType: prepared.voucher.discountType,
                      discountValue: prepared.voucher.discountValue,
                      discountAmount: prepared.voucher.discountAmount,
                    },
                  }
                : {}),
              shippingMethod: prepared.shippingMethod,
              paymentMethod: dto.paymentMethod,
              paymentStatus: payment.paymentStatus,
              ...(payment.paymentStatus === PaymentStatus.PAID
                ? { paidAt: now }
                : {}),
              paymentProvider: payment.provider,
              ...(payment.momoRequest ? { momoRequest: payment.momoRequest } : {}),
              ...(payment.payosRequest ? { payosRequest: payment.payosRequest } : {}),
              ...(payment.paymentReference
                ? { paymentReference: payment.paymentReference }
                : {}),
              ...(payment.paymentUrl ? { paymentUrl: payment.paymentUrl } : {}),
              orderStatus: OrderStatus.PENDING,
              statusHistory: [
                {
                  status: OrderStatus.PENDING,
                  note: 'Order created.',
                  changedBy: new Types.ObjectId(userId),
                  changedAt: now,
                },
              ],
              ...(dto.note ? { note: dto.note } : {}),
              stockRestored: false,
            },
          ],
          { session },
        );
        createdOrder = order;

        await this.cartModel
          .updateOne(
            { _id: prepared.cartId, user: userId },
            { $set: { items: [] } },
            { session },
          )
          .exec();
      });
    } finally {
      await session.endSession();
    }

    if (!createdOrder) {
      throw new ConflictException('Order could not be created. Please try again.');
    }

    const response = this.toResponse(createdOrder);
    // COD is acknowledged once the order commits. An online order is only
    // acknowledged after verified payment, never merely for creating its QR.
    if (response.paymentMethod === PaymentMethod.COD ||
      response.paymentStatus === PaymentStatus.PAID) {
      const confirmation = response.paymentMethod === PaymentMethod.COD
        ? this.sendOrderConfirmation(response)
        : this.sendPaymentConfirmation(response);
      void confirmation.catch((error: unknown) => {
        this.logger.warn(
          `Could not send confirmation for ${response.orderCode}: ${
            error instanceof Error ? error.message : 'unknown mail error'
          }`,
        );
      });
    }

    return response;
  }

  async findMine(
    userId: string,
    query: MyOrdersQueryDto,
  ): Promise<PaginatedResult<OrderResponse[]>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const filter: Record<string, unknown> = {
      user: this.toUserObjectId(userId),
    };

    if (query.status) {
      filter.orderStatus = query.status;
    }

    const [orders, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments(filter).exec(),
    ]);

    return createPaginatedResult(
      orders.map((order) => this.toResponse(order)),
      page,
      limit,
      total,
    );
  }

  async findMineById(userId: string, orderId: string): Promise<OrderResponse> {
    const order = await this.orderModel
      .findOne({ _id: orderId, user: this.toUserObjectId(userId) })
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    return this.toResponse(order);
  }

  async trackPublic(dto: TrackOrderDto): Promise<OrderTrackingResponse> {
    const order = await this.orderModel
      .findOne({ orderCode: dto.orderCode })
      .select(
        'orderCode customerInfo.phone shippingAddress.phone orderStatus paymentStatus shippingMethod statusHistory createdAt updatedAt',
      )
      .exec();

    const suppliedPhone = this.normalizePhone(dto.phone);
    const phoneMatches =
      order &&
      [order.customerInfo.phone, order.shippingAddress.phone].some(
        (phone) => this.normalizePhone(phone) === suppliedPhone,
      );

    if (!order || !phoneMatches) {
      throw new NotFoundException('Order tracking information was not found.');
    }

    return {
      orderCode: order.orderCode,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      shippingMethod: order.shippingMethod,
      statusHistory: order.statusHistory.map((history) => ({
        status: history.status,
        changedAt: history.changedAt,
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  async findAdmin(
    query: AdminOrderQueryDto,
  ): Promise<PaginatedResult<OrderResponse[]>> {
    if (query.startDate && query.endDate && query.startDate > query.endDate) {
      throw new BadRequestException('startDate must be before endDate.');
    }

    const filter: Record<string, unknown> = {};
    if (query.keyword) {
      const keyword = new RegExp(this.escapeRegExp(query.keyword), 'i');
      filter.$or = [
        { orderCode: keyword },
        { 'customerInfo.fullName': keyword },
        { 'customerInfo.email': keyword },
        { 'customerInfo.phone': keyword },
      ];
    }
    if (query.orderStatus) {
      filter.orderStatus = query.orderStatus;
    }
    if (query.paymentStatus) {
      filter.paymentStatus = query.paymentStatus;
    }
    if (query.startDate || query.endDate) {
      filter.createdAt = {
        ...(query.startDate ? { $gte: query.startDate } : {}),
        ...(query.endDate ? { $lte: query.endDate } : {}),
      };
    }

    const [orders, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .exec(),
      this.orderModel.countDocuments(filter).exec(),
    ]);

    return createPaginatedResult(
      orders.map((order) => this.toResponse(order)),
      query.page,
      query.limit,
      total,
    );
  }

  async findAdminById(orderId: string): Promise<OrderResponse> {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      throw new NotFoundException('Order not found.');
    }
    return this.toResponse(order);
  }

  async syncPaymentByAdmin(orderId: string): Promise<OrderResponse> {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      throw new NotFoundException('Order not found.');
    }
    if (order.paymentMethod !== PaymentMethod.ONLINE ||
      order.paymentProvider !== 'PAYOS' || !order.payosRequest) {
      throw new BadRequestException('Đơn hàng này không dùng payOS.');
    }
    // Closed orders still need reconciliation when a bank transfer arrives late.
    // This never creates a payment link or accepts a client-supplied paid status.
    if (order.payosStartedAt) await this.syncPayosOrder(order, false);
    return this.findAdminById(orderId);
  }

  async updateStatusByAdmin(
    actor: AuthenticatedUser,
    orderId: string,
    dto: UpdateOrderStatusDto,
  ): Promise<OrderResponse> {
    const session = await this.connection.startSession();
    let updatedOrder: OrderDocument | undefined;

    try {
      await session.withTransaction(async () => {
        const order = await this.orderModel.findById(orderId).session(session).exec();
        if (!order) {
          throw new NotFoundException('Order not found.');
        }

        const allowedStatuses = ADMIN_ORDER_TRANSITIONS[order.orderStatus];
        if (!allowedStatuses.includes(dto.orderStatus)) {
          throw new BadRequestException(
            `Cannot transition an order from ${order.orderStatus} to ${dto.orderStatus}.`,
          );
        }

        if (
          order.paymentMethod === PaymentMethod.ONLINE &&
          dto.orderStatus !== OrderStatus.CANCELLED &&
          order.paymentStatus !== PaymentStatus.PAID
        ) {
          throw new BadRequestException(
            'Online payment must be confirmed before the order can progress.',
          );
        }

        const now = new Date();
        if (dto.orderStatus === OrderStatus.CANCELLED) {
          if (!dto.note) {
            throw new BadRequestException('A cancellation reason is required.');
          }

          if (!order.stockRestored) {
            for (const item of order.items) {
              await this.restoreVariantStock(item, session);
            }
            order.stockRestored = true;
          }

          if (order.voucher?.voucherId) {
            await this.vouchersService.release(order.voucher.voucherId.toString(), session);
          }

          if (order.paymentStatus === PaymentStatus.PAID ||
            (order.paymentProvider === 'PAYOS' && (order.payosAmountPaid ?? 0) > 0)) {
            this.recordCancelledPayment(order, now);
          }
          order.cancellationReason = dto.note;
          order.cancelledAt = now;
        } else if (
          dto.orderStatus === OrderStatus.DELIVERED &&
          order.paymentMethod === PaymentMethod.COD &&
          order.paymentStatus === PaymentStatus.UNPAID
        ) {
          order.paymentStatus = PaymentStatus.PAID;
          order.paidAt = now;
        }

        order.orderStatus = dto.orderStatus;
        order.statusHistory.push({
          status: dto.orderStatus,
          ...(dto.note ? { note: dto.note } : {}),
          changedBy: new Types.ObjectId(actor.userId),
          changedAt: now,
        } as OrderStatusHistoryEntry);
        await order.save({ session });
        updatedOrder = order;
      });
    } finally {
      await session.endSession();
    }

    if (!updatedOrder) {
      throw new ConflictException('Order status could not be updated. Please try again.');
    }

    // COD already received its placement receipt; delivery still records paid
    // money without sending an online-payment confirmation a second time.
    return this.toResponse(updatedOrder);
  }

  async cancelMine(
    userId: string,
    orderId: string,
    dto: CancelOrderDto,
  ): Promise<OrderResponse> {
    const session = await this.connection.startSession();
    let cancelledOrder: OrderDocument | undefined;

    try {
      await session.withTransaction(async () => {
        const order = await this.orderModel
          .findOne({ _id: orderId, user: this.toUserObjectId(userId) })
          .session(session)
          .exec();

        if (!order) {
          throw new NotFoundException('Order not found.');
        }

        if (order.orderStatus !== OrderStatus.PENDING) {
          throw new BadRequestException(
            'Only pending orders can be cancelled by the customer.',
          );
        }

        if (!order.stockRestored) {
          for (const item of order.items) {
            await this.restoreVariantStock(item, session);
          }
          order.stockRestored = true;
        }

        if (order.voucher?.voucherId) {
          await this.vouchersService.release(order.voucher.voucherId.toString(), session);
        }

        const now = new Date();
        if (order.paymentStatus === PaymentStatus.PAID ||
          (order.paymentProvider === 'PAYOS' && (order.payosAmountPaid ?? 0) > 0)) {
          this.recordCancelledPayment(order, now);
        }

        order.orderStatus = OrderStatus.CANCELLED;
        order.cancellationReason = dto.reason;
        order.cancelledAt = now;
        order.statusHistory.push({
          status: OrderStatus.CANCELLED,
          note: dto.reason,
          changedBy: new Types.ObjectId(userId),
          changedAt: now,
        } as OrderStatusHistoryEntry);
        await order.save({ session });
        cancelledOrder = order;
      });
    } finally {
      await session.endSession();
    }

    if (!cancelledOrder) {
      throw new ConflictException('Order could not be cancelled. Please try again.');
    }

    return this.toResponse(cancelledOrder);
  }

  async getOnlinePayment(
    userId: string,
    orderCode: string,
    paymentReference?: string,
  ): Promise<OnlinePaymentResponse> {
    const order = await this.findOwnedOnlineOrder(userId, orderCode, paymentReference);
    if (order.paymentProvider === 'PAYOS') {
      return {
        order: this.toResponse(order),
        instruction: {
          mode: 'PAYOS', amount: order.total,
          paymentReference: order.paymentReference,
          transferContent: order.payosDescription ?? order.payosRequest?.description ?? order.orderCode,
          customerCanConfirm: false,
          paymentStarted: Boolean(order.payosStartedAt),
          amountPaid: order.payosAmountPaid ?? 0,
          ...(order.payosRequest ? { expiresAt: new Date(order.payosRequest.expiredAt * 1000).toISOString() } : {}),
          instructions: 'Quét mã bằng ứng dụng ngân hàng. Giữ đúng số tiền và nội dung chuyển khoản. Hệ thống kiểm tra kết quả trực tiếp với payOS.',
          ...(order.paymentStatus === PaymentStatus.UNPAID && order.orderStatus !== OrderStatus.CANCELLED
            ? {
              gatewayUrl: order.payosGatewayUrl, qrPayload: order.payosQrPayload,
              accountNumber: order.payosAccountNumber, accountName: order.payosAccountName,
              bankBin: order.payosBankBin,
            } : {}),
        },
      };
    }
    if (order.paymentProvider === 'MOMO') {
      return {
        order: this.toResponse(order),
        instruction: {
          mode: 'MOMO',
          amount: order.total,
          paymentReference: order.paymentReference!,
          transferContent: order.orderCode,
          environment: order.momoRequest?.environment,
          customerCanConfirm: false,
          paymentStarted: Boolean(order.momoStartedAt),
          instructions: 'Quét mã bằng MoMo hoặc mở trang thanh toán MoMo. Đơn chỉ được xác nhận khi hệ thống nhận thông báo thanh toán hợp lệ từ MoMo.',
          ...(order.paymentStatus === PaymentStatus.UNPAID && order.orderStatus !== OrderStatus.CANCELLED
            ? { gatewayUrl: order.momoGatewayUrl, qrPayload: order.momoQrPayload }
            : {}),
        },
      };
    }
    return {
      order: this.toResponse(order),
      instruction: await this.paymentsService.getOnlineQrInstruction({
        orderCode: order.orderCode,
        amount: order.total,
        customerId: userId,
        paymentReference: order.paymentReference,
        provider: order.paymentProvider,
      }),
    };
  }

  getOnlinePaymentOptions() {
    return this.paymentsService.getOnlinePaymentOptions();
  }

  async startOnlinePayment(
    userId: string,
    orderCode: string,
    paymentReference: string,
  ): Promise<OnlinePaymentResponse> {
    const order = await this.findOwnedOnlineOrder(userId, orderCode, paymentReference);
    if (order.paymentProvider === 'PAYOS') {
      return this.startPayosPayment(order);
    }
    if (order.paymentProvider !== 'MOMO' || !order.momoRequest) {
      throw new BadRequestException('Đơn hàng này không sử dụng MoMo.');
    }
    if (order.orderStatus === OrderStatus.CANCELLED || order.paymentStatus !== PaymentStatus.UNPAID) {
      throw new BadRequestException('Đơn hàng này không còn chờ thanh toán.');
    }
    if (order.momoGatewayUrl) {
      return this.getOnlinePayment(userId, orderCode, paymentReference);
    }
    if (order.momoStartedAt && Date.now() - order.momoStartedAt.getTime() > 86_400_000) {
      throw new BadRequestException('Phiên thanh toán đã cũ. Vui lòng liên hệ cửa hàng để đối soát trước khi thanh toán lại.');
    }

    const now = new Date();
    const leaseToken = randomUUID();
    const claimed = await this.orderModel.findOneAndUpdate(
      {
        _id: order._id,
        paymentStatus: PaymentStatus.UNPAID,
        orderStatus: { $ne: OrderStatus.CANCELLED },
        momoGatewayUrl: { $exists: false },
        $or: [{ momoLeaseUntil: { $exists: false } }, { momoLeaseUntil: { $lte: now } }],
      },
      { $set: {
        momoStartedAt: order.momoStartedAt ?? now,
        momoLeaseUntil: new Date(now.getTime() + 60_000),
        momoLeaseToken: leaseToken,
      } },
      { new: true },
    ).exec();
    if (!claimed?.momoRequest) {
      throw new ConflictException('Thanh toán đang được xử lý hoặc trạng thái đơn đã thay đổi. Vui lòng cập nhật trạng thái.');
    }

    try {
      // Deliberately outside withTransaction: MongoDB may rerun its callback.
      // Retrying this call reuses the immutable merchant request/transaction ID.
      const result = await this.paymentsService.createMomoPayment(claimed.momoRequest);
      await this.orderModel.updateOne(
        { _id: order._id, momoLeaseToken: leaseToken },
        { $set: {
          momoGatewayUrl: result.gatewayUrl,
          ...(result.qrPayload ? { momoQrPayload: result.qrPayload } : {}),
        } },
      ).exec();
    } finally {
      await this.orderModel.updateOne(
        { _id: order._id, momoLeaseToken: leaseToken },
        { $unset: { momoLeaseUntil: 1, momoLeaseToken: 1 } },
      ).exec();
    }
    return this.getOnlinePayment(userId, orderCode, paymentReference);
  }

  private async startPayosPayment(order: OrderDocument): Promise<OnlinePaymentResponse> {
    if (!order.payosRequest || order.orderStatus === OrderStatus.CANCELLED || order.paymentStatus !== PaymentStatus.UNPAID) {
      throw new BadRequestException('Đơn hàng này không còn chờ thanh toán payOS.');
    }
    if (order.payosGatewayUrl) {
      return this.getOnlinePayment(order.user.toString(), order.orderCode, order.paymentReference);
    }
    if (!order.payosStartedAt && order.payosRequest.expiredAt * 1000 <= Date.now()) {
      throw new BadRequestException('Mã thanh toán đã hết hạn. Vui lòng kiểm tra đơn hàng trước khi đặt lại.');
    }
    const now = new Date();
    const token = randomUUID();
    const claimed = await this.orderModel.findOneAndUpdate({
      _id: order._id, paymentStatus: PaymentStatus.UNPAID,
      orderStatus: { $ne: OrderStatus.CANCELLED }, payosGatewayUrl: { $exists: false },
      $or: [{ payosLeaseUntil: { $exists: false } }, { payosLeaseUntil: { $lte: now } }],
    }, { $set: {
      payosStartedAt: order.payosStartedAt ?? now,
      payosLeaseUntil: new Date(now.getTime() + 60_000), payosLeaseToken: token,
    } }, { new: true }).exec();
    if (!claimed?.payosRequest) {
      throw new ConflictException('Đang tạo mã thanh toán hoặc trạng thái đơn đã thay đổi. Vui lòng kiểm tra lại.');
    }
    try {
      // Calling the gateway here cannot be repeated by MongoDB transaction retries.
      const result = await this.paymentsService.createPayosPayment(claimed.payosRequest, Boolean(order.payosStartedAt));
      await this.orderModel.updateOne({ _id: order._id, payosLeaseToken: token }, { $set: {
        payosLinkId: result.paymentLinkId, payosGatewayUrl: result.gatewayUrl,
        payosDescription: result.description,
        ...(result.qrPayload ? { payosQrPayload: result.qrPayload } : {}),
        ...(result.accountNumber ? { payosAccountNumber: result.accountNumber } : {}),
        ...(result.accountName ? { payosAccountName: result.accountName } : {}),
        ...(result.bankBin ? { payosBankBin: result.bankBin } : {}),
      } }).exec();
      // Creating a link is never proof of payment. Status is applied by sync/webhook.
    } finally {
      await this.orderModel.updateOne({ _id: order._id, payosLeaseToken: token },
        { $unset: { payosLeaseUntil: 1, payosLeaseToken: 1 } }).exec();
    }
    return this.getOnlinePayment(order.user.toString(), order.orderCode, order.paymentReference);
  }

  async syncOnlinePayment(userId: string, orderCode: string, paymentReference: string): Promise<OnlinePaymentResponse> {
    const order = await this.findOwnedOnlineOrder(userId, orderCode, paymentReference);
    if (order.paymentProvider !== 'PAYOS' || !order.payosRequest) {
      throw new BadRequestException('Đơn hàng này không dùng payOS.');
    }
    if (order.payosStartedAt) await this.syncPayosOrder(order, false);
    return this.getOnlinePayment(userId, orderCode, paymentReference);
  }

  async handlePayosNotification(body: unknown): Promise<void> {
    const notification = this.paymentsService.verifyPayosNotification(body);
    // The outer success/code values are not signed; only signed data is trusted.
    if (notification.code !== '00') return;
    const order = await this.orderModel.findOne({
      paymentProvider: 'PAYOS', 'payosRequest.orderCode': notification.orderCode,
    }).exec();
    // payOS sends signed sample data when registering a webhook. Acknowledge
    // unknown orders without creating records or marking anything paid.
    if (!order) return;
    if (!order.payosRequest || !order.payosStartedAt ||
      order.paymentMethod !== PaymentMethod.ONLINE ||
      (order.payosLinkId && order.payosLinkId !== notification.paymentLinkId)) {
      throw new BadRequestException('Thông báo payOS không khớp yêu cầu thanh toán.');
    }
    await this.syncPayosOrder(order, true, notification.paymentLinkId);
  }

  private async syncPayosOrder(order: OrderDocument, fromWebhook: boolean, expectedLinkId?: string): Promise<void> {
    if (!order.payosRequest || !order.payosStartedAt) return;
    const now = new Date();
    if (!fromWebhook && order.payosSyncedAt && now.getTime() - order.payosSyncedAt.getTime() < 10_000) return;
    const token = randomUUID();
    const claimed = await this.orderModel.findOneAndUpdate({
      _id: order._id,
      $or: [{ payosLeaseUntil: { $exists: false } }, { payosLeaseUntil: { $lte: now } }],
      ...(!fromWebhook ? { $and: [{ $or: [
        { payosSyncedAt: { $exists: false } }, { payosSyncedAt: { $lte: new Date(now.getTime() - 10_000) } },
      ] }] } : {}),
    }, { $set: { payosLeaseUntil: new Date(now.getTime() + 30_000), payosLeaseToken: token } }, { new: true }).exec();
    if (!claimed?.payosRequest) {
      // A webhook must be retried if another in-flight query may have read an
      // older status. Browser polling will simply see its current snapshot.
      if (fromWebhook) throw new ServiceUnavailableException('Payment reconciliation is in progress. Retry notification.');
      return;
    }
    try {
      const state = await this.paymentsService.getPayosPayment(claimed.payosRequest);
      if (expectedLinkId && state.paymentLinkId !== expectedLinkId) {
        throw new BadRequestException('Mã link trong thông báo payOS không khớp giao dịch.');
      }
      await this.applyPayosState(order.id as string, state);
    } finally {
      await this.orderModel.updateOne({ _id: order._id, payosLeaseToken: token },
        { $unset: { payosLeaseUntil: 1, payosLeaseToken: 1 } }).exec();
    }
  }

  private async applyPayosState(orderId: string, state: PayosPaymentState): Promise<void> {
    const session = await this.connection.startSession();
    let confirmedOrder: OrderDocument | undefined;
    try {
      await session.withTransaction(async () => {
        confirmedOrder = undefined;
        const order = await this.orderModel.findById(orderId).session(session).exec();
        if (!order?.payosRequest || order.paymentProvider !== 'PAYOS' ||
          state.orderCode !== order.payosRequest.orderCode || state.amount !== order.total ||
          state.amount !== order.payosRequest.amount || (order.payosLinkId && order.payosLinkId !== state.paymentLinkId)) {
          throw new BadRequestException('Kết quả payOS không khớp số tiền hoặc đơn hàng.');
        }
        if (state.status === 'PAID' && (state.amountPaid < order.total || state.amountRemaining !== 0)) {
          throw new BadRequestException('payOS chưa xác nhận đủ số tiền của đơn hàng.');
        }
        order.payosLinkId = state.paymentLinkId;
        order.payosSyncedAt = new Date();
        // Never downgrade paid money when an older query finishes late.
        order.payosAmountPaid = Math.max(order.payosAmountPaid ?? 0, state.amountPaid);
        if ([PaymentStatus.PAID, PaymentStatus.REFUND_PENDING, PaymentStatus.REFUNDED].includes(order.paymentStatus)) {
          await order.save({ session });
          return;
        }
        order.payosStatus = state.status;
        if (state.status === 'PAID') {
          order.paidAt = new Date();
          order.paymentStatus = order.orderStatus === OrderStatus.CANCELLED
            ? PaymentStatus.REFUND_PENDING : PaymentStatus.PAID;
          if (order.paymentStatus === PaymentStatus.PAID) confirmedOrder = order;
        } else if (['CANCELLED', 'EXPIRED', 'FAILED'].includes(state.status) || order.orderStatus === OrderStatus.CANCELLED) {
          order.paymentStatus = order.payosAmountPaid > 0 ? PaymentStatus.REFUND_PENDING : PaymentStatus.FAILED;
        }
        await order.save({ session });
      });
    } finally {
      await session.endSession();
    }
    if (confirmedOrder) {
      const response = this.toResponse(confirmedOrder);
      void this.sendPaymentConfirmation(response).catch(() => {
        this.logger.warn(`Could not send payment email for ${response.orderCode}.`);
      });
    }
  }

  async handleMomoNotification(body: unknown): Promise<void> {
    const notification = this.paymentsService.verifyMomoNotification(body);
    const session = await this.connection.startSession();
    let confirmedOrder: OrderDocument | undefined;
    try {
      await session.withTransaction(async () => {
        confirmedOrder = undefined;
        const order = await this.orderModel.findOne({
          paymentProvider: 'MOMO',
          paymentReference: notification.orderId,
        }).session(session).exec();
        const request = order?.momoRequest;
        if (!order || !request || !order.momoStartedAt ||
          order.paymentMethod !== PaymentMethod.ONLINE ||
          notification.partnerCode !== request.partnerCode ||
          notification.orderId !== request.orderId ||
          notification.requestId !== request.requestId ||
          notification.amount !== order.total || notification.amount !== request.amount ||
          notification.orderInfo !== request.orderInfo || notification.extraData !== request.extraData) {
          throw new BadRequestException('MoMo notification does not match a payment request.');
        }
        if ([PaymentStatus.PAID, PaymentStatus.REFUND_PENDING, PaymentStatus.REFUNDED].includes(order.paymentStatus)) {
          if (notification.resultCode === 0 && order.momoTransId !== String(notification.transId)) {
            throw new ConflictException('MoMo transaction does not match the recorded payment.');
          }
          return;
        }
        order.momoResultCode = notification.resultCode;
        if (notification.resultCode === 0) {
          if (Number(notification.transId) <= 0) {
            throw new BadRequestException('Successful MoMo payment requires a transaction ID.');
          }
          order.momoTransId = String(notification.transId);
          order.paidAt = new Date();
          order.paymentStatus = order.orderStatus === OrderStatus.CANCELLED
            ? PaymentStatus.REFUND_PENDING : PaymentStatus.PAID;
          await order.save({ session });
          if (order.paymentStatus === PaymentStatus.PAID) {
            confirmedOrder = order;
          }
        } else {
          if (MOMO_FINAL_FAILURES.has(notification.resultCode)) {
            order.paymentStatus = PaymentStatus.FAILED;
          }
          await order.save({ session });
        }
      });
    } finally {
      await session.endSession();
    }
    if (confirmedOrder) {
      const response = this.toResponse(confirmedOrder);
      void this.sendPaymentConfirmation(response).catch(() => {
        this.logger.warn(`Could not send payment email for ${response.orderCode}.`);
      });
    }
  }

  private async findOwnedOnlineOrder(
    userId: string,
    orderCode: string,
    paymentReference?: string,
  ): Promise<OrderDocument & { paymentReference: string }> {
    const order = await this.orderModel.findOne({
      user: this.toUserObjectId(userId), orderCode: orderCode.trim().toUpperCase(),
    }).exec();
    if (!order) throw new NotFoundException('Order not found.');
    if (order.paymentMethod !== PaymentMethod.ONLINE || !order.paymentReference) {
      throw new BadRequestException('This order does not use QR payment.');
    }
    if (paymentReference !== undefined && order.paymentReference !== paymentReference.trim()) {
      throw new BadRequestException('QR payment reference does not match the order.');
    }
    return order as OrderDocument & { paymentReference: string };
  }

  private recordCancelledPayment(order: OrderDocument, now: Date): void {
    if (order.paymentProvider === 'MOMO' || order.paymentProvider === 'PAYOS') {
      // Cancelling an order is not a gateway refund. Keep it visible for
      // reconciliation until a separate, verified refund flow is added.
      order.paymentStatus = PaymentStatus.REFUND_PENDING;
    } else {
      order.paymentStatus = PaymentStatus.REFUNDED;
      order.refundedAt = now;
    }
  }

  async confirmSandboxOnlinePayment(
    userId: string,
    orderCode: string,
    paymentReference: string,
  ): Promise<OrderResponse> {
    const session = await this.connection.startSession();
    let confirmedOrder: OrderDocument | undefined;
    let paymentWasConfirmed = false;

    try {
      await session.withTransaction(async () => {
        paymentWasConfirmed = false;
        const order = await this.orderModel
          .findOne({
            user: this.toUserObjectId(userId),
            orderCode: orderCode.trim().toUpperCase(),
          })
          .session(session)
          .exec();

        if (!order) {
          throw new NotFoundException('Order not found.');
        }

        if (
          order.paymentMethod !== PaymentMethod.ONLINE ||
          ![
            MOCK_ONLINE_PAYMENT_PROVIDER,
            QR_TRANSFER_PAYMENT_PROVIDER,
          ].includes(order.paymentProvider ?? '')
        ) {
          throw new BadRequestException('This order does not use QR payment.');
        }

        if (!this.paymentsService.canConfirmOnlinePaymentFromCustomer(order.paymentProvider)) {
          throw new BadRequestException(
            'A verified payment gateway callback is required to confirm a live QR payment.',
          );
        }

        if (order.paymentReference !== paymentReference.trim()) {
          throw new BadRequestException('QR payment reference does not match the order.');
        }

        if (order.orderStatus === OrderStatus.CANCELLED) {
          throw new BadRequestException('A cancelled order cannot be paid.');
        }

        if (order.paymentStatus === PaymentStatus.PAID) {
          confirmedOrder = order;
          return;
        }

        if (order.paymentStatus !== PaymentStatus.UNPAID) {
          throw new BadRequestException('This payment can no longer be confirmed.');
        }

        order.paymentStatus = PaymentStatus.PAID;
        order.paidAt = new Date();
        await order.save({ session });
        confirmedOrder = order;
        paymentWasConfirmed = true;
      });
    } finally {
      await session.endSession();
    }

    if (!confirmedOrder) {
      throw new ConflictException('Payment could not be confirmed. Please try again.');
    }

    const response = this.toResponse(confirmedOrder);

    if (paymentWasConfirmed) {
      void this.sendPaymentConfirmation(response).catch((error: unknown) => {
        this.logger.warn(
          `Could not send payment confirmation for ${response.orderCode}: ${
            error instanceof Error ? error.message : 'unknown mail error'
          }`,
        );
      });
    }

    return response;
  }

  private async findUser(userId: string, session: import('mongoose').ClientSession): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).session(session).exec();

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return user;
  }

  private toUserObjectId(userId: string): Types.ObjectId {
    return new Types.ObjectId(userId);
  }

  private async decreaseVariantStock(
    item: CheckoutItemSnapshot,
    session: import('mongoose').ClientSession,
  ): Promise<void> {
    const result = await this.productModel
      .updateOne(
        {
          _id: item.productId,
          status: ProductStatus.ACTIVE,
          catalogOnly: { $ne: true },
          variants: {
            $elemMatch: {
              _id: item.variantId,
              stock: { $gte: item.quantity },
            },
          },
        },
        {
          $inc: {
            'variants.$.stock': -item.quantity,
            soldCount: item.quantity,
          },
        },
        { session },
      )
      .exec();

    if (result.modifiedCount !== 1) {
      throw new ConflictException(
        `Stock changed for ${item.name}. Refresh the cart and try again.`,
      );
    }
  }

  private async restoreVariantStock(
    item: OrderItem,
    session: import('mongoose').ClientSession,
  ): Promise<void> {
    const result = await this.productModel
      .updateOne(
        {
          _id: item.productId,
          soldCount: { $gte: item.quantity },
          variants: { $elemMatch: { _id: item.variantId } },
        },
        {
          $inc: {
            'variants.$.stock': item.quantity,
            soldCount: -item.quantity,
          },
        },
        { session },
      )
      .exec();

    if (result.modifiedCount !== 1) {
      throw new ConflictException(
        `Stock could not be restored for ${item.name}.`,
      );
    }
  }

  private toOrderItem(item: CheckoutItemSnapshot): OrderItem {
    return {
      productId: new Types.ObjectId(item.productId),
      categoryId: new Types.ObjectId(item.categoryId),
      variantId: new Types.ObjectId(item.variantId),
      name: item.name,
      slug: item.slug,
      productSku: item.productSku,
      sku: item.sku,
      image: item.image,
      color: item.color,
      ...(item.colorHex ? { colorHex: item.colorHex } : {}),
      size: item.size,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    };
  }

  private createOrderCode(): string {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const random = randomBytes(8).toString('hex').toUpperCase();
    return `ORD-${date}-${random}`;
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private normalizePhone(value: string): string {
    return normalizeVietnameseMobile(value) ?? value.replace(/\D/g, '');
  }

  private async sendOrderConfirmation(order: OrderResponse): Promise<void> {
    await this.mailService.sendOrderConfirmationEmail({
      ...this.toMailOrder(order),
    });
  }

  private async sendPaymentConfirmation(order: OrderResponse): Promise<void> {
    await this.mailService.sendPaymentConfirmationEmail({
      ...this.toMailOrder(order),
    });
  }

  private toMailOrder(order: OrderResponse) {
    return {
      id: order.id,
      to: order.customerInfo.email,
      fullName: order.customerInfo.fullName,
      orderCode: order.orderCode,
      total: order.total,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
      ...(order.paidAt ? { paidAt: order.paidAt } : {}),
      subtotal: order.subtotal,
      discount: order.discount,
      shippingFee: order.shippingFee,
      shippingMethod: order.shippingMethod,
      orderStatus: order.orderStatus,
      ...(order.voucher ? { voucher: { code: order.voucher.code } } : {}),
      ...(order.note ? { note: order.note } : {}),
      items: order.items,
      shippingAddress: order.shippingAddress,
    };
  }

  private toResponse(order: OrderDocument): OrderResponse {
    return {
      id: order._id.toString(),
      orderCode: order.orderCode,
      customerInfo: {
        fullName: order.customerInfo.fullName,
        email: order.customerInfo.email,
        phone: order.customerInfo.phone,
      },
      shippingAddress: {
        recipientName: order.shippingAddress.recipientName,
        phone: order.shippingAddress.phone,
        province: order.shippingAddress.province,
        district: order.shippingAddress.district,
        ward: order.shippingAddress.ward,
        addressLine: order.shippingAddress.addressLine,
        ...(order.shippingAddress.note ? { note: order.shippingAddress.note } : {}),
      },
      items: order.items.map((item) => ({
        productId: item.productId.toString(),
        ...(item.categoryId ? { categoryId: item.categoryId.toString() } : {}),
        variantId: item.variantId.toString(),
        name: item.name,
        slug: item.slug,
        productSku: item.productSku,
        sku: item.sku,
        image: item.image,
        color: item.color,
        ...(item.colorHex ? { colorHex: item.colorHex } : {}),
        size: item.size,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
      subtotal: order.subtotal,
      discount: order.discount,
      shippingFee: order.shippingFee,
      total: order.total,
      ...(order.voucher
        ? {
            voucher: {
              code: order.voucher.code,
              name: order.voucher.name,
              discountAmount: order.voucher.discountAmount,
            },
          }
        : {}),
      shippingMethod: order.shippingMethod,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      ...(order.paymentProvider === 'PAYOS'
        ? { receivedPaymentAmount: order.payosAmountPaid ?? 0 }
        : {}),
      ...(order.paidAt ? { paidAt: order.paidAt } : {}),
      ...(order.refundedAt ? { refundedAt: order.refundedAt } : {}),
      ...(order.paymentProvider ? { paymentProvider: order.paymentProvider } : {}),
      ...(order.paymentReference ? { paymentReference: order.paymentReference } : {}),
      ...(order.paymentUrl ? { paymentUrl: order.paymentUrl } : {}),
      orderStatus: order.orderStatus,
      statusHistory: order.statusHistory.map((history) => ({
        status: history.status,
        ...(history.note ? { note: history.note } : {}),
        changedAt: history.changedAt,
      })),
      ...(order.note ? { note: order.note } : {}),
      ...(order.cancellationReason
        ? { cancellationReason: order.cancellationReason }
        : {}),
      ...(order.cancelledAt ? { cancelledAt: order.cancelledAt } : {}),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
