import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  HydratedDocument,
  Schema as MongooseSchema,
  Types,
} from 'mongoose';

export enum CategoryType {
  BICYCLE = 'BICYCLE',
  ACCESSORY = 'ACCESSORY',
  MIXED = 'MIXED',
}

export interface ICategory {
  name: string;
  slug: string;
  type: CategoryType;
  description?: string;
  imageUrl?: string;
  parentCategory?: Types.ObjectId | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export type CategoryDocument = HydratedDocument<Category>;

@Schema({ collection: 'categories', timestamps: true, versionKey: false })
export class Category implements ICategory {
  @Prop({ type: String, required: true, trim: true, maxlength: 150 })
  name!: string;

  @Prop({
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: 180,
  })
  slug!: string;

  @Prop({ type: String, enum: CategoryType, default: CategoryType.MIXED })
  type!: CategoryType;

  @Prop({ type: String, trim: true, maxlength: 2000 })
  description?: string;

  @Prop({ type: String, trim: true, maxlength: 2048 })
  imageUrl?: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Category.name,
    default: null,
    index: true,
  })
  parentCategory?: Types.ObjectId | null;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;

  @Prop({ type: Number, default: 0, min: 0 })
  sortOrder!: number;

  createdAt!: Date;
  updatedAt!: Date;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
CategorySchema.index({ parentCategory: 1, name: 1 });
