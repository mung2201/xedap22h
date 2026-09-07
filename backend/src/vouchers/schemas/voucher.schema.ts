import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { VoucherDiscountType } from '../../common/enums/commerce.enum';

export type VoucherDocument = HydratedDocument<Voucher>;

@Schema({ collection: 'vouchers', timestamps: true, versionKey: false })
export class Voucher {
  @Prop({
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    maxlength: 64,
  })
  code!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 180 })
  name!: string;

  @Prop({ type: String, trim: true, maxlength: 1000 })
  description?: string;

  @Prop({ type: String, enum: VoucherDiscountType, required: true })
  discountType!: VoucherDiscountType;

  @Prop({ type: Number, required: true, min: 0 })
  discountValue!: number;

  @Prop({ type: Number, min: 0 })
  maxDiscount?: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  minOrderValue!: number;

  @Prop({ type: Date, required: true, index: true })
  startDate!: Date;

  @Prop({ type: Date, required: true, index: true })
  endDate!: Date;

  @Prop({ type: Number, min: 1 })
  usageLimit?: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  usedCount!: number;

  @Prop({ type: Boolean, default: true, index: true })
  active!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export const VoucherSchema = SchemaFactory.createForClass(Voucher);
VoucherSchema.index({ code: 1 }, { unique: true });
VoucherSchema.index({ active: 1, startDate: 1, endDate: 1 });
