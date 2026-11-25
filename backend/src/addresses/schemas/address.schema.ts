import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { AddressFormat } from '../address-format.enum';

export type AddressDocument = HydratedDocument<Address>;

@Schema({ collection: 'addresses', timestamps: true, versionKey: false })
export class Address {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: true,
    index: true,
  })
  user!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 120 })
  recipientName!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 25 })
  phone!: string;

  @Prop({ type: String, enum: AddressFormat })
  addressFormat?: AddressFormat;

  @Prop({ type: String, required: true, trim: true, maxlength: 120 })
  province!: string;

  @Prop({ type: String, default: '', trim: true, maxlength: 120 })
  district!: string;

  @Prop({ type: String, default: '', trim: true, maxlength: 120 })
  ward!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 300 })
  addressLine!: string;

  @Prop({ type: String, trim: true, maxlength: 500 })
  note?: string;

  @Prop({ type: Boolean, default: false })
  isDefault!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export const AddressSchema = SchemaFactory.createForClass(Address);
AddressSchema.index({ user: 1, isDefault: 1 });
AddressSchema.index(
  { user: 1 },
  {
    unique: true,
    partialFilterExpression: { isDefault: true },
    name: 'one_default_address_per_user',
  },
);
