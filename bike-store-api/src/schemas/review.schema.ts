import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  HydratedDocument,
  Schema as MongooseSchema,
  Types,
} from 'mongoose';
import { Order } from './order.schema';
import { Product } from './product.schema';
import { User } from './user.schema';

export enum ReviewStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  HIDDEN = 'HIDDEN',
  REJECTED = 'REJECTED',
}

export interface IReview {
  product: Types.ObjectId;
  user: Types.ObjectId;
  order?: Types.ObjectId;
  rating: number;
  title?: string;
  content?: string;
  imageUrls: string[];
  isVerifiedPurchase: boolean;
  status: ReviewStatus;
  adminReply?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ReviewDocument = HydratedDocument<Review>;

@Schema({ collection: 'reviews', timestamps: true, versionKey: false })
export class Review implements IReview {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Product.name,
    required: true,
    index: true,
  })
  product!: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: true,
    index: true,
  })
  user!: Types.ObjectId;

  // Chỉ gán khi service xác minh người dùng đã mua sản phẩm trong đơn này.
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Order.name })
  order?: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1, max: 5 })
  rating!: number;

  @Prop({ type: String, trim: true, maxlength: 200 })
  title?: string;

  @Prop({ type: String, trim: true, maxlength: 5000 })
  content?: string;

  @Prop({ type: [String], default: [] })
  imageUrls!: string[];

  @Prop({ type: Boolean, default: false })
  isVerifiedPurchase!: boolean;

  @Prop({ type: String, enum: ReviewStatus, default: ReviewStatus.PENDING })
  status!: ReviewStatus;

  @Prop({ type: String, trim: true, maxlength: 3000 })
  adminReply?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

// Mỗi khách hàng đánh giá một sản phẩm một lần; có thể sửa nội dung đánh giá.
ReviewSchema.index({ product: 1, user: 1 }, { unique: true });
ReviewSchema.index({ product: 1, status: 1, createdAt: -1 });
