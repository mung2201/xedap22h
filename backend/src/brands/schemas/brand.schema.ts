import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BrandDocument = HydratedDocument<Brand>;

@Schema({ collection: 'brands', timestamps: true, versionKey: false })
export class Brand {
  @Prop({ type: String, required: true, trim: true, maxlength: 120 })
  name!: string;

  @Prop({ type: String, required: true, trim: true, lowercase: true, maxlength: 160 })
  slug!: string;

  @Prop({ type: String, trim: true, maxlength: 1500 })
  description?: string;

  @Prop({ type: String, trim: true, maxlength: 2048 })
  logoUrl?: string;

  @Prop({ type: String, trim: true, maxlength: 2048 })
  website?: string;

  @Prop({ type: Boolean, default: true, index: true })
  isActive!: boolean;

  @Prop({ type: Number, default: 0, min: 0, index: true })
  sortOrder!: number;

  createdAt!: Date;
  updatedAt!: Date;
}

export const BrandSchema = SchemaFactory.createForClass(Brand);
BrandSchema.index({ slug: 1 }, { unique: true });
BrandSchema.index({ name: 1, isActive: 1 });
