import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type CartDocument = HydratedDocument<Cart>;

@Schema({ versionKey: false })
export class CartItem {
  _id!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product', required: true })
  product!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  variantId!: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1, max: 99 })
  quantity!: number;

  // Server-generated fallbacks keep an unavailable line intelligible without
  // allowing the browser to influence pricing or product identity.
  @Prop({ type: String, required: true, trim: true, maxlength: 220 })
  productName!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 240 })
  productSlug!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 2048 })
  thumbnail!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 80 })
  variantColor!: string;

  @Prop({ type: String, trim: true, maxlength: 16 })
  variantColorHex?: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 80 })
  variantSize!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 80 })
  variantSku!: string;

  @Prop({ type: Number, required: true, min: 0 })
  lastKnownUnitPrice!: number;
}

export const CartItemSchema = SchemaFactory.createForClass(CartItem);

@Schema({ collection: 'carts', timestamps: true, versionKey: false })
export class Cart {
  // Existing cart/wishlist owners are stored as strings; keep their persisted type.
  @Prop({ type: String, ref: 'User', required: true })
  user!: string;

  @Prop({ type: [CartItemSchema], default: [] })
  items!: CartItem[];

  createdAt!: Date;
  updatedAt!: Date;
}

export const CartSchema = SchemaFactory.createForClass(Cart);
CartSchema.index({ user: 1 }, { unique: true });
