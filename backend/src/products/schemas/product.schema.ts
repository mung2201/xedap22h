import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  BikeType,
  ProductStatus,
  ProductType,
} from '../../common/enums/catalog.enum';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ _id: false, versionKey: false })
export class ProductImage {
  @Prop({ type: String, required: true, trim: true, maxlength: 2048 })
  url!: string;

  @Prop({ type: String, trim: true, maxlength: 180 })
  alt?: string;

  @Prop({ type: Number, default: 0, min: 0 })
  sortOrder!: number;
}

export const ProductImageSchema = SchemaFactory.createForClass(ProductImage);

@Schema({ _id: false, versionKey: false })
export class ProductSpecification {
  @Prop({ type: String, required: true, trim: true, maxlength: 100 })
  label!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 1000 })
  value!: string;

  @Prop({ type: String, trim: true, maxlength: 100 })
  group?: string;
}

export const ProductSpecificationSchema = SchemaFactory.createForClass(
  ProductSpecification,
);

@Schema({ versionKey: false })
export class ProductVariant {
  _id!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 80 })
  color!: string;

  @Prop({ type: String, trim: true, maxlength: 16 })
  colorHex?: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 80 })
  size!: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    maxlength: 80,
  })
  sku!: string;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  stock!: number;

  @Prop({ type: Number, default: 0 })
  priceAdjustment!: number;

  @Prop({ type: String, trim: true, maxlength: 2048 })
  imageUrl?: string;
}

export const ProductVariantSchema = SchemaFactory.createForClass(ProductVariant);

@Schema({ collection: 'products', timestamps: true, versionKey: false })
export class Product {
  @Prop({ type: String, required: true, trim: true, maxlength: 220 })
  name!: string;

  @Prop({ type: String, required: true, trim: true, lowercase: true, maxlength: 240 })
  slug!: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    maxlength: 80,
  })
  sku!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 600 })
  shortDescription!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 30_000 })
  description!: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true, index: true })
  category!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Brand', required: true, index: true })
  brand!: Types.ObjectId;

  @Prop({ type: String, enum: ProductType, required: true, index: true })
  productType!: ProductType;

  @Prop({ type: Number, required: true, min: 0 })
  originalPrice!: number;

  @Prop({ type: Number, required: true, min: 0, index: true })
  salePrice!: number;

  @Prop({ type: [ProductImageSchema], default: [] })
  images!: ProductImage[];

  @Prop({ type: String, required: true, trim: true, maxlength: 2048 })
  thumbnail!: string;

  @Prop({ type: String, enum: ProductStatus, default: ProductStatus.ACTIVE, index: true })
  status!: ProductStatus;

  @Prop({ type: Boolean, default: false, index: true })
  featured!: boolean;

  @Prop({ type: String, enum: BikeType, index: true })
  bikeType?: BikeType;

  @Prop({ type: String, trim: true, maxlength: 120 })
  frameMaterial?: string;

  @Prop({ type: String, trim: true, maxlength: 80 })
  wheelSize?: string;

  @Prop({ type: String, trim: true, maxlength: 80 })
  weight?: string;

  @Prop({ type: [ProductSpecificationSchema], default: [] })
  specifications!: ProductSpecification[];

  @Prop({
    type: [ProductVariantSchema],
    required: true,
    validate: {
      validator: (variants: ProductVariant[]) => variants.length > 0,
      message: 'A product must have at least one variant.',
    },
  })
  variants!: ProductVariant[];

  @Prop({ type: Number, default: 0, min: 0, max: 5 })
  averageRating!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  reviewCount!: number;

  @Prop({ type: Number, default: 0, min: 0, index: true })
  soldCount!: number;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
ProductSchema.index({ slug: 1 }, { unique: true });
ProductSchema.index({ sku: 1 }, { unique: true });
ProductSchema.index({ 'variants.sku': 1 }, { unique: true });
ProductSchema.index({ category: 1, status: 1, salePrice: 1 });
ProductSchema.index({ brand: 1, status: 1, salePrice: 1 });
ProductSchema.index({ status: 1, featured: 1, createdAt: -1 });
ProductSchema.index({ 'variants.color': 1, 'variants.size': 1 });
ProductSchema.index({ name: 'text', shortDescription: 'text', description: 'text' });
