import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  HydratedDocument,
  Schema as MongooseSchema,
  Types,
} from 'mongoose';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ShippingMethod,
  VoucherDiscountType,
} from '../../common/enums/commerce.enum';
import type { MomoCreateRequest } from '../../payments/providers/momo-payment.types';
import type { PayosCreateRequest } from '../../payments/providers/payos-payment.types';

export type OrderDocument = HydratedDocument<Order>;

@Schema({ _id: false, versionKey: false })
export class OrderCustomerInfo {
  @Prop({ type: String, required: true, trim: true, maxlength: 120 })
  fullName!: string;

  @Prop({ type: String, required: true, trim: true, lowercase: true, maxlength: 255 })
  email!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 25 })
  phone!: string;
}

export const OrderCustomerInfoSchema = SchemaFactory.createForClass(OrderCustomerInfo);

@Schema({ _id: false, versionKey: false })
export class OrderShippingAddress {
  @Prop({ type: String, required: true, trim: true, maxlength: 120 })
  recipientName!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 25 })
  phone!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 120 })
  province!: string;

  @Prop({ type: String, default: '', trim: true, maxlength: 120 })
  district!: string;

  @Prop({ type: String, default: '', trim: true, maxlength: 120 })
  ward!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 300 })
  addressLine!: string;

  @Prop({ type: String, trim: true, maxlength: 500 })
  note?: string;
}

export const OrderShippingAddressSchema = SchemaFactory.createForClass(
  OrderShippingAddress,
);

@Schema({ _id: false, versionKey: false })
export class OrderItem {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product', required: true })
  productId!: Types.ObjectId;

  // Historical category ownership is stored with the item so dashboard reports
  // remain correct if the product is later moved to another category.
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Category' })
  categoryId?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  variantId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 220 })
  name!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 240 })
  slug!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 80 })
  productSku!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 80 })
  sku!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 2048 })
  image!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 80 })
  color!: string;

  @Prop({ type: String, trim: true, maxlength: 16 })
  colorHex?: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 80 })
  size!: string;

  @Prop({ type: Number, required: true, min: 1 })
  quantity!: number;

  @Prop({ type: Number, required: true, min: 0 })
  unitPrice!: number;

  @Prop({ type: Number, required: true, min: 0 })
  totalPrice!: number;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ _id: false, versionKey: false })
export class OrderVoucherSnapshot {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Voucher', required: true })
  voucherId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 64 })
  code!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 180 })
  name!: string;

  @Prop({ type: String, enum: VoucherDiscountType, required: true })
  discountType!: VoucherDiscountType;

  @Prop({ type: Number, required: true, min: 0 })
  discountValue!: number;

  @Prop({ type: Number, required: true, min: 0 })
  discountAmount!: number;
}

export const OrderVoucherSnapshotSchema = SchemaFactory.createForClass(
  OrderVoucherSnapshot,
);

@Schema({ _id: false, versionKey: false })
export class OrderStatusHistoryEntry {
  @Prop({ type: String, enum: OrderStatus, required: true })
  status!: OrderStatus;

  @Prop({ type: String, trim: true, maxlength: 500 })
  note?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  changedBy?: Types.ObjectId;

  @Prop({ type: Date, required: true, default: Date.now })
  changedAt!: Date;
}

export const OrderStatusHistoryEntrySchema = SchemaFactory.createForClass(
  OrderStatusHistoryEntry,
);

@Schema({ collection: 'orders', timestamps: true, versionKey: false })
export class Order {
  @Prop({ type: String, required: true, trim: true, uppercase: true, maxlength: 48 })
  orderCode!: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  user!: Types.ObjectId;

  @Prop({ type: OrderCustomerInfoSchema, required: true })
  customerInfo!: OrderCustomerInfo;

  @Prop({ type: OrderShippingAddressSchema, required: true })
  shippingAddress!: OrderShippingAddress;

  @Prop({
    type: [OrderItemSchema],
    required: true,
    validate: {
      validator: (items: OrderItem[]) => items.length > 0,
      message: 'An order must contain at least one item.',
    },
  })
  items!: OrderItem[];

  @Prop({ type: Number, required: true, min: 0 })
  subtotal!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  discount!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  shippingFee!: number;

  @Prop({ type: Number, required: true, min: 0 })
  total!: number;

  @Prop({ type: OrderVoucherSnapshotSchema })
  voucher?: OrderVoucherSnapshot;

  @Prop({ type: String, enum: ShippingMethod, required: true })
  shippingMethod!: ShippingMethod;

  @Prop({ type: String, enum: PaymentMethod, required: true })
  paymentMethod!: PaymentMethod;

  @Prop({ type: String, enum: PaymentStatus, required: true, default: PaymentStatus.UNPAID })
  paymentStatus!: PaymentStatus;

  // These timestamps preserve the financial event time independently from
  // order creation, which is essential for accurate revenue reporting.
  @Prop({ type: Date, index: true })
  paidAt?: Date;

  @Prop({ type: Date })
  refundedAt?: Date;

  @Prop({ type: String, trim: true, maxlength: 80 })
  paymentProvider?: string;

  @Prop({ type: String, trim: true, maxlength: 160 })
  paymentReference?: string;

  @Prop({ type: String, trim: true, maxlength: 2048 })
  paymentUrl?: string;

  // Created locally with the order, before any gateway call. This immutable
  // snapshot contains no credentials and keeps retries on the same request.
  @Prop({ type: MongooseSchema.Types.Mixed, immutable: true })
  momoRequest?: MomoCreateRequest;

  @Prop({ type: Date })
  momoStartedAt?: Date;

  @Prop({ type: Date })
  momoLeaseUntil?: Date;

  @Prop({ type: String })
  momoLeaseToken?: string;

  @Prop({ type: String, maxlength: 4096 })
  momoGatewayUrl?: string;

  @Prop({ type: String, maxlength: 8192 })
  momoQrPayload?: string;

  @Prop({ type: String, maxlength: 80 })
  momoTransId?: string;

  @Prop({ type: Number })
  momoResultCode?: number;

  @Prop({ type: MongooseSchema.Types.Mixed, immutable: true })
  payosRequest?: PayosCreateRequest;

  @Prop({ type: Date })
  payosStartedAt?: Date;

  @Prop({ type: Date })
  payosLeaseUntil?: Date;

  @Prop({ type: String })
  payosLeaseToken?: string;

  @Prop({ type: String, maxlength: 100 })
  payosLinkId?: string;

  @Prop({ type: String, maxlength: 4096 })
  payosGatewayUrl?: string;

  @Prop({ type: String, maxlength: 8192 })
  payosQrPayload?: string;

  @Prop({ type: String, maxlength: 100 })
  payosAccountNumber?: string;

  @Prop({ type: String, maxlength: 300 })
  payosAccountName?: string;

  @Prop({ type: String, maxlength: 20 })
  payosBankBin?: string;

  @Prop({ type: String, maxlength: 500 })
  payosDescription?: string;

  @Prop({ type: Number, min: 0 })
  payosAmountPaid?: number;

  @Prop({ type: String, maxlength: 30 })
  payosStatus?: string;

  @Prop({ type: Date })
  payosSyncedAt?: Date;

  @Prop({ type: String, enum: OrderStatus, required: true, default: OrderStatus.PENDING, index: true })
  orderStatus!: OrderStatus;

  @Prop({ type: [OrderStatusHistoryEntrySchema], default: [] })
  statusHistory!: OrderStatusHistoryEntry[];

  @Prop({ type: String, trim: true, maxlength: 500 })
  note?: string;

  @Prop({ type: String, trim: true, maxlength: 500 })
  cancellationReason?: string;

  @Prop({ type: Date })
  cancelledAt?: Date;

  @Prop({ type: Boolean, default: false })
  stockRestored!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ orderCode: 1 }, { unique: true });
OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ orderStatus: 1, createdAt: -1 });
OrderSchema.index({ paymentStatus: 1, createdAt: -1 });
OrderSchema.index({ paymentStatus: 1, orderStatus: 1, createdAt: -1 });
OrderSchema.index({ paymentStatus: 1, paidAt: -1 });
OrderSchema.index(
  { paymentProvider: 1, paymentReference: 1 },
  { unique: true, partialFilterExpression: { paymentProvider: 'MOMO', paymentReference: { $type: 'string' } } },
);
OrderSchema.index(
  { 'payosRequest.orderCode': 1 },
  { unique: true, partialFilterExpression: { 'payosRequest.orderCode': { $type: 'number' } } },
);
