import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
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
import { PaymentsService } from '../payments/payments.service';
import { MOCK_ONLINE_PAYMENT_PROVIDER } from '../payments/providers/mock-online-payment.provider';
import { QR_TRANSFER_PAYMENT_PROVIDER } from '../payments/providers/qr-transfer-payment.provider';
import { QrPaymentInstruction } from '../payments/providers/payment-provider.interface';
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
                phone: user.phone ?? prepared.shippingAddress.phone,
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
    void this.sendOrderConfirmation(response).catch((error: unknown) => {
      this.logger.warn(
        `Could not send confirmation for ${response.orderCode}: ${
          error instanceof Error ? error.message : 'unknown mail error'
        }`,
      );
    });

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

          if (order.paymentStatus === PaymentStatus.PAID) {
            order.paymentStatus = PaymentStatus.REFUNDED;
            order.refundedAt = now;
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
        if (order.paymentStatus === PaymentStatus.PAID) {
          order.paymentStatus = PaymentStatus.REFUNDED;
          order.refundedAt = now;
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
    const normalizedOrderCode = orderCode.trim().toUpperCase();
    const order = await this.orderModel
      .findOne({
        user: this.toUserObjectId(userId),
        orderCode: normalizedOrderCode,
      })
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    if (order.paymentMethod !== PaymentMethod.ONLINE || !order.paymentReference) {
      throw new BadRequestException('This order does not use QR payment.');
    }

    if (
      paymentReference &&
      order.paymentReference !== paymentReference.trim()
    ) {
      throw new BadRequestException('QR payment reference does not match the order.');
    }

    return {
      order: this.toResponse(order),
      instruction: await this.paymentsService.getOnlineQrInstruction({
        orderCode: order.orderCode,
        amount: order.total,
        customerId: userId,
        paymentReference: order.paymentReference,
      }),
    };
  }

  async confirmSandboxOnlinePayment(
    userId: string,
    orderCode: string,
    paymentReference: string,
  ): Promise<OrderResponse> {
    if (!this.paymentsService.canConfirmOnlinePaymentFromCustomer()) {
      throw new BadRequestException(
        'A verified payment gateway callback is required to confirm a live QR payment.',
      );
    }

    const session = await this.connection.startSession();
    let confirmedOrder: OrderDocument | undefined;
    let paymentWasConfirmed = false;

    try {
      await session.withTransaction(async () => {
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
    return value.replace(/\D/g, '');
  }

  private async sendOrderConfirmation(order: OrderResponse): Promise<void> {
    await this.mailService.sendOrderConfirmationEmail({
      to: order.customerInfo.email,
      fullName: order.customerInfo.fullName,
      orderCode: order.orderCode,
      total: order.total,
      paymentMethod: order.paymentMethod,
    });
  }

  private async sendPaymentConfirmation(order: OrderResponse): Promise<void> {
    await this.mailService.sendPaymentConfirmationEmail({
      to: order.customerInfo.email,
      fullName: order.customerInfo.fullName,
      orderCode: order.orderCode,
      total: order.total,
    });
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
