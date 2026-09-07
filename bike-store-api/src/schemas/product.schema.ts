import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  HydratedDocument,
  Schema as MongooseSchema,
  Types,
} from 'mongoose';
import { Category } from './category.schema';

export enum ProductType {
  BICYCLE = 'BICYCLE',
  ACCESSORY = 'ACCESSORY',
}

export enum ProductStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export interface IColorVariant {
  colorName: string;
  colorHex?: string;
  sku: string;
  price: number;
  stock: number;
  imageUrls: string[];
  isActive: boolean;
}

export interface IFrameSizeVariant {
  frameSize: string;
  colors: IColorVariant[];
}

export interface IProduct {
  category: Types.ObjectId;
  type: ProductType;
  name: string;
  slug: string;
  brand?: string;
  description: string;
  price: number;
  stock: number;
  imageUrls: string[];
  specifications?: Record<string, string | number | boolean>;
  variants: IFrameSizeVariant[];
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type ProductDocument = HydratedDocument<Product>;

@Schema({ _id: false })
export class ColorVariant implements IColorVariant {
  @Prop({ type: String, required: true, trim: true, maxlength: 80 })
  colorName!: string;

  @Prop({
    type: String,
    trim: true,
    match: /^#(?:[0-9a-fA-F]{3}){1,2}$/,
  })
  colorHex?: string;

  // SKU là định danh biến thể được lưu snapshot trong Order.
  @Prop({ type: String, required: true, trim: true, uppercase: true, maxlength: 80 })
  sku!: string;

  @Prop({ type: Number, required: true, min: 0 })
  price!: number;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  stock!: number;

  @Prop({ type: [String], default: [] })
  imageUrls!: string[];

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;
}

export const ColorVariantSchema = SchemaFactory.createForClass(ColorVariant);

@Schema({ _id: false })
export class FrameSizeVariant implements IFrameSizeVariant {
  // Ví dụ: XS, S, M, L, XL hoặc 48cm, 52cm.
  @Prop({ type: String, required: true, trim: true, maxlength: 30 })
  frameSize!: string;

  @Prop({
    type: [ColorVariantSchema],
    required: true,
    validate: {
      validator: (colors: IColorVariant[]) => Array.isArray(colors) && colors.length > 0,
      message: 'Mỗi kích cỡ khung phải có ít nhất một màu.',
    },
  })
  colors!: IColorVariant[];
}

export const FrameSizeVariantSchema =
  SchemaFactory.createForClass(FrameSizeVariant);

@Schema({ collection: 'products', timestamps: true, versionKey: false })
export class Product implements IProduct {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Category.name,
    required: true,
    index: true,
  })
  category!: Types.ObjectId;

  @Prop({ type: String, enum: ProductType, required: true })
  type!: ProductType;

  @Prop({ type: String, required: true, trim: true, maxlength: 255 })
  name!: string;

  @Prop({
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: 280,
  })
  slug!: string;

  @Prop({ type: String, trim: true, maxlength: 100 })
  brand?: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 10000 })
  description!: string;

  // Giá từ thấp nhất và tổng tồn kho để truy vấn danh sách nhanh.
  // ProductService cần đồng bộ hai trường này khi variants thay đổi.
  @Prop({ type: Number, required: true, min: 0 })
  price!: number;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  stock!: number;

  @Prop({ type: [String], default: [] })
  imageUrls!: string[];

  @Prop({ type: MongooseSchema.Types.Mixed })
  specifications?: Record<string, string | number | boolean>;

  // Cấu trúc: frameSize -> colors -> price/stock/SKU.
  @Prop({ type: [FrameSizeVariantSchema], default: [] })
  variants!: IFrameSizeVariant[];

  @Prop({ type: String, enum: ProductStatus, default: ProductStatus.DRAFT })
  status!: ProductStatus;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
ProductSchema.index({ category: 1, status: 1 });
ProductSchema.index({ type: 1, status: 1 });
ProductSchema.index({ name: 'text', description: 'text', brand: 'text' });
