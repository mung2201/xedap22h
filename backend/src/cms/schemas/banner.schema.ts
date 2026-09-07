import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  BannerPosition,
  BannerType,
} from '../../common/enums/cms.enum';

export type BannerDocument = HydratedDocument<Banner>;

@Schema({ collection: 'banners', timestamps: true, versionKey: false })
export class Banner {
  @Prop({ type: String, required: true, trim: true, maxlength: 160 })
  title!: string;

  @Prop({ type: String, trim: true, maxlength: 360 })
  subtitle?: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 2048 })
  imageUrl!: string;

  @Prop({ type: String, trim: true, maxlength: 2048 })
  mobileImageUrl?: string;

  @Prop({ type: String, trim: true, maxlength: 2048 })
  link?: string;

  @Prop({ type: String, trim: true, maxlength: 48 })
  buttonLabel?: string;

  @Prop({ type: Boolean, default: false })
  openInNewTab!: boolean;

  @Prop({
    type: String,
    enum: BannerType,
    default: BannerType.SLIDER,
    index: true,
  })
  type!: BannerType;

  @Prop({
    type: String,
    enum: BannerPosition,
    default: BannerPosition.HOME_HERO,
    index: true,
  })
  position!: BannerPosition;

  @Prop({ type: Number, min: 0, default: 0 })
  sortOrder!: number;

  @Prop({ type: Boolean, default: true, index: true })
  active!: boolean;

  @Prop({ type: Date })
  startDate?: Date;

  @Prop({ type: Date })
  endDate?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;

  createdAt!: Date;
  updatedAt!: Date;
}

export const BannerSchema = SchemaFactory.createForClass(Banner);
BannerSchema.index({ type: 1, position: 1, active: 1, sortOrder: 1 });
BannerSchema.index({ active: 1, startDate: 1, endDate: 1 });
