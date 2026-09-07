import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type FaqDocument = HydratedDocument<Faq>;

@Schema({ collection: 'faq', timestamps: true, versionKey: false })
export class Faq {
  @Prop({ type: String, required: true, trim: true, maxlength: 240 })
  question!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 5_000 })
  answer!: string;

  @Prop({ type: [String], required: true, default: [], maxlength: 30 })
  keywords!: string[];

  @Prop({ type: Number, required: true, default: 0, min: 0, max: 10_000 })
  priority!: number;

  @Prop({ type: Boolean, required: true, default: true, index: true })
  active!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;

  createdAt!: Date;
  updatedAt!: Date;
}

export const FaqSchema = SchemaFactory.createForClass(Faq);
FaqSchema.index({ active: 1, priority: -1, updatedAt: -1 });
FaqSchema.index({ keywords: 1 });
