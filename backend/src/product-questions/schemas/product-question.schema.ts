import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { ProductQuestionStatus } from '../../common/enums/product-question.enum';

export type ProductQuestionDocument = HydratedDocument<ProductQuestion>;

@Schema({ _id: false, versionKey: false })
export class ProductQuestionProductSnapshot {
  @Prop({ type: String, required: true, trim: true, maxlength: 220 })
  name!: string;

  @Prop({ type: String, required: true, trim: true, lowercase: true, maxlength: 240 })
  slug!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 2048 })
  thumbnail!: string;
}

export const ProductQuestionProductSnapshotSchema = SchemaFactory.createForClass(
  ProductQuestionProductSnapshot,
);

@Schema({ _id: false, versionKey: false })
export class ProductQuestionAnswer {
  @Prop({ type: String, required: true, trim: true, maxlength: 3000 })
  content!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  answeredBy!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 120 })
  answeredByName!: string;

  @Prop({ type: Date, required: true })
  answeredAt!: Date;
}

export const ProductQuestionAnswerSchema = SchemaFactory.createForClass(
  ProductQuestionAnswer,
);

@Schema({ collection: 'product_questions', timestamps: true, versionKey: false })
export class ProductQuestion {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product', required: true, index: true })
  product!: Types.ObjectId;

  @Prop({
    type: ProductQuestionProductSnapshotSchema,
    required: true,
  })
  productSnapshot!: ProductQuestionProductSnapshot;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  user!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 120 })
  authorName!: string;

  @Prop({ type: String, trim: true, maxlength: 2048 })
  authorAvatarUrl?: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 1500 })
  question!: string;

  @Prop({
    type: String,
    enum: ProductQuestionStatus,
    default: ProductQuestionStatus.PENDING,
    index: true,
  })
  status!: ProductQuestionStatus;

  @Prop({ type: ProductQuestionAnswerSchema })
  answer?: ProductQuestionAnswer;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ProductQuestionSchema = SchemaFactory.createForClass(ProductQuestion);
ProductQuestionSchema.index({ product: 1, status: 1, createdAt: -1 });
ProductQuestionSchema.index({ user: 1, createdAt: -1 });
ProductQuestionSchema.index({ status: 1, updatedAt: -1 });
