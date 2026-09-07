import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { PageStatus } from '../../common/enums/cms.enum';

export type StaticPageDocument = HydratedDocument<StaticPage>;

@Schema({ collection: 'pages', timestamps: true, versionKey: false })
export class StaticPage {
  @Prop({ type: String, required: true, trim: true, maxlength: 180 })
  title!: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 180,
  })
  slug!: string;

  @Prop({ type: String, trim: true, maxlength: 1000 })
  excerpt?: string;

  @Prop({ type: String, required: true, maxlength: 50_000 })
  content!: string;

  @Prop({
    type: String,
    enum: PageStatus,
    default: PageStatus.DRAFT,
    index: true,
  })
  status!: PageStatus;

  @Prop({ type: String, trim: true, maxlength: 180 })
  seoTitle?: string;

  @Prop({ type: String, trim: true, maxlength: 320 })
  seoDescription?: string;

  @Prop({ type: Date })
  publishedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;

  createdAt!: Date;
  updatedAt!: Date;
}

export const StaticPageSchema = SchemaFactory.createForClass(StaticPage);
StaticPageSchema.index({ slug: 1 }, { unique: true });
StaticPageSchema.index({ status: 1, publishedAt: -1, createdAt: -1 });
