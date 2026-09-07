import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({ collection: 'categories', timestamps: true, versionKey: false })
export class Category {
  @Prop({ type: String, required: true, trim: true, maxlength: 120 })
  name!: string;

  @Prop({ type: String, required: true, trim: true, lowercase: true, maxlength: 160 })
  slug!: string;

  @Prop({ type: String, trim: true, maxlength: 1000 })
  description?: string;

  @Prop({ type: String, trim: true, maxlength: 2048 })
  imageUrl?: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', default: null, index: true })
  parentCategory?: Types.ObjectId;

  @Prop({ type: Boolean, default: true, index: true })
  isActive!: boolean;

  @Prop({ type: Number, default: 0, min: 0 })
  sortOrder!: number;

  createdAt!: Date;
  updatedAt!: Date;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
CategorySchema.index({ slug: 1 }, { unique: true });
CategorySchema.index({ parentCategory: 1, isActive: 1, sortOrder: 1 });
