import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  HydratedDocument,
  Schema as MongooseSchema,
  Types,
} from 'mongoose';
import { Product } from './product.schema';
import { User } from './user.schema';

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  RETURNED = 'RETURNED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  COD = 'COD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  VNPAY = 'VNPAY',
  MOMO = 'MOMO',
  CARD = 'CARD',
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export interface ISelectedVariant {
  frameSize?: string;
  colorName?: string;
  colorHex?: string;
  sku?: string;
}

export interface IOrderItem {
  product: Types.ObjectId;
  productName: string;
  productImageUrl?: string;
  selectedVariant?: ISelectedVariant;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface IShippingAddress {
  recipientName: string;
  phone: string;
  addressLine: string;
  ward?: string;
  district?: string;
  provinceOrCity: string;
  country: string;
}

export interface IOrder {
  orderNumber: string;
  user: Types.ObjectId;
  items: IOrderItem[];
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  deliveryStatus: DeliveryStatus;
  shippingAddress: IShippingAddress;
  customerNote?: string;
  trackingNumber?: string;
  placedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderDocument = HydratedDocument<Order>;

@Schema({ _id: false })
export class SelectedVariant implements ISelectedVariant {
  @Prop({ type: String, trim: true, maxlength: 30 })
  frameSize?: string;

  @Prop({ type: String, trim: true, maxlength: 80 })
  colorName?: string;

  @Prop({
    type: String,
    trim: true,
    match: /^#(?:[0-9a-fA-F]{3}){1,2}$/,
  })
  colorHex?: string;

  @Prop({ type: String, trim: true, uppercase: true, maxlength: 80 })
  sku?: string;
}

export const SelectedVariantSchema =
  SchemaFactory.createForClass(SelectedVariant);

@Schema({ _id: false })
export class OrderItem implements IOrderItem {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Product.name,
    required: true,
  })
  product!: Types.ObjectId;

  // Snapshot để đơn hàng không đổi nếu sản phẩm bị đổi tên/ảnh/giá.
  @Prop({ type: String, required: true, trim: true, maxlength: 255 })
  productName!: string;

  @Prop({ type: String, trim: true, maxlength: 2048 })
  productImageUrl?: string;

  @Prop({ type: SelectedVariantSchema, default: null })
  selectedVariant?: ISelectedVariant;

  @Prop({ type: Number, required: true, min: 0 })
  unitPrice!: number;

  @Prop({ type: Number, required: true, min: 1 })
  quantity!: number;

  @Prop({ type: Number, required: true, min: 0 })
  lineTotal!: number;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ _id: false })
export class ShippingAddress implements IShippingAddress {
  @Prop({ type: String, required: true, trim: true, maxlength: 120 })
  recipientName!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 25 })
  phone!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 300 })
  addressLine!: string;

  @Prop({ type: String, trim: true, maxlength: 100 })
  ward?: string;

  @Prop({ type: String, trim: true, maxlength: 100 })
  district?: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 100 })
  provinceOrCity!: string;

  @Prop({ type: String, required: true, trim: true, default: 'Vietnam' })
  country!: string;
}

export const ShippingAddressSchema =
  SchemaFactory.createForClass(ShippingAddress);

@Schema({ collection: 'orders', timestamps: true, versionKey: false })
export class Order implements IOrder {
  @Prop({ type: String, required: true, unique: true, trim: true, uppercase: true })
  orderNumber!: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: true,
    index: true,
  })
  user!: Types.ObjectId;

  @Prop({
    type: [OrderItemSchema],
    required: true,
    validate: {
      validator: (items: IOrderItem[]) => Array.isArray(items) && items.length > 0,
      message: 'Đơn hàng phải có ít nhất một sản phẩm.',
    },
  })
  items!: IOrderItem[];

  @Prop({ type: Number, required: true, min: 0 })
  subtotal!: number;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  discountAmount!: number;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  shippingFee!: number;

  @Prop({ type: Number, required: true, min: 0 })
  totalAmount!: number;

  @Prop({ type: String, enum: PaymentMethod, required: true })
  paymentMethod!: PaymentMethod;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.UNPAID })
  paymentStatus!: PaymentStatus;

  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.PENDING })
  orderStatus!: OrderStatus;

  @Prop({
    type: String,
    enum: DeliveryStatus,
    default: DeliveryStatus.PENDING,
  })
  deliveryStatus!: DeliveryStatus;

  @Prop({ type: ShippingAddressSchema, required: true })
  shippingAddress!: IShippingAddress;

  @Prop({ type: String, trim: true, maxlength: 1000 })
  customerNote?: string;

  @Prop({ type: String, trim: true, maxlength: 100 })
  trackingNumber?: string;

  @Prop({ type: Date, default: Date.now, immutable: true })
  placedAt!: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ orderStatus: 1, deliveryStatus: 1, createdAt: -1 });
