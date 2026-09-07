import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BikeType } from '../../common/enums/catalog.enum';

export type SizeGuideDocument = HydratedDocument<SizeGuide>;

@Schema({ collection: 'size_guides', timestamps: true, versionKey: false })
export class SizeGuide {
  @Prop({ type: String, enum: BikeType, required: true, index: true })
  bikeType!: BikeType;

  @Prop({ type: Number, required: true, min: 100, max: 250 })
  minHeightCm!: number;

  @Prop({ type: Number, required: true, min: 100, max: 250 })
  maxHeightCm!: number;

  @Prop({ type: String, required: true, trim: true, maxlength: 40 })
  recommendedSize!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 80 })
  frameSizeLabel!: string;

  @Prop({ type: String, trim: true, maxlength: 1000 })
  description?: string;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  sortOrder!: number;

  @Prop({ type: Boolean, required: true, default: true, index: true })
  active!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;

  createdAt!: Date;
  updatedAt!: Date;
}

export const SizeGuideSchema = SchemaFactory.createForClass(SizeGuide);
SizeGuideSchema.index({ bikeType: 1, active: 1, minHeightCm: 1, maxHeightCm: 1 });
SizeGuideSchema.index({ bikeType: 1, sortOrder: 1, minHeightCm: 1 });
