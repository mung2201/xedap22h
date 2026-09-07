import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  ServiceBookingStatus,
  ServiceBookingType,
} from '../../common/enums/service-booking.enum';

export type ServiceBookingDocument = HydratedDocument<ServiceBooking>;

@Schema({ _id: false, versionKey: false })
export class ServiceBookingContact {
  @Prop({ type: String, required: true, trim: true, maxlength: 120 })
  name!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 25 })
  phone!: string;

  @Prop({ type: String, required: true, trim: true, lowercase: true, maxlength: 255 })
  email!: string;
}

export const ServiceBookingContactSchema = SchemaFactory.createForClass(
  ServiceBookingContact,
);

@Schema({ _id: false, versionKey: false })
export class ServiceBookingStatusHistoryEntry {
  @Prop({ type: String, enum: ServiceBookingStatus, required: true })
  status!: ServiceBookingStatus;

  @Prop({ type: String, trim: true, maxlength: 500 })
  note?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  changedBy?: Types.ObjectId;

  @Prop({ type: Date, required: true, default: Date.now })
  changedAt!: Date;
}

export const ServiceBookingStatusHistoryEntrySchema = SchemaFactory.createForClass(
  ServiceBookingStatusHistoryEntry,
);

@Schema({ collection: 'service_bookings', timestamps: true, versionKey: false })
export class ServiceBooking {
  @Prop({ type: String, required: true, trim: true, uppercase: true, maxlength: 48 })
  bookingCode!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user!: Types.ObjectId;

  @Prop({ type: ServiceBookingContactSchema, required: true })
  contact!: ServiceBookingContact;

  @Prop({ type: String, enum: ServiceBookingType, required: true })
  serviceType!: ServiceBookingType;

  @Prop({ type: Date, required: true, index: true })
  preferredDate!: Date;

  @Prop({ type: String, required: true, trim: true, maxlength: 40 })
  preferredTimeSlot!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 160 })
  serviceLocation!: string;

  @Prop({ type: String, trim: true, maxlength: 120 })
  bicycleBrand?: string;

  @Prop({ type: String, trim: true, maxlength: 160 })
  bicycleModel?: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 1_000 })
  description!: string;

  @Prop({ type: String, enum: ServiceBookingStatus, default: ServiceBookingStatus.PENDING, index: true })
  status!: ServiceBookingStatus;

  @Prop({ type: [ServiceBookingStatusHistoryEntrySchema], default: [] })
  statusHistory!: ServiceBookingStatusHistoryEntry[];

  @Prop({ type: String, trim: true, maxlength: 1_000 })
  adminNote?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ServiceBookingSchema = SchemaFactory.createForClass(ServiceBooking);
ServiceBookingSchema.index({ bookingCode: 1 }, { unique: true });
ServiceBookingSchema.index({ user: 1, preferredDate: -1, createdAt: -1 });
ServiceBookingSchema.index({ status: 1, preferredDate: 1 });
