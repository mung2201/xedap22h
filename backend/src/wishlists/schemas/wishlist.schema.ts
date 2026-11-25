import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type WishlistDocument = HydratedDocument<Wishlist>;

@Schema({ _id: false, versionKey: false })
export class WishlistItem {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product', required: true })
  product!: Types.ObjectId;

  @Prop({ type: Date, required: true, default: Date.now })
  addedAt!: Date;
}

export const WishlistItemSchema = SchemaFactory.createForClass(WishlistItem);

@Schema({ collection: 'wishlists', timestamps: true, versionKey: false })
export class Wishlist {
  // Existing cart/wishlist owners are stored as strings; keep their persisted type.
  @Prop({ type: String, ref: 'User', required: true })
  user!: string;

  @Prop({ type: [WishlistItemSchema], default: [] })
  items!: WishlistItem[];

  createdAt!: Date;
  updatedAt!: Date;
}

export const WishlistSchema = SchemaFactory.createForClass(Wishlist);
WishlistSchema.index({ user: 1 }, { unique: true });
