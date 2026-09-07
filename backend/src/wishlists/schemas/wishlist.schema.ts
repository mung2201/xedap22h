import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type WishlistDocument = HydratedDocument<Wishlist>;

@Schema({ _id: false, versionKey: false })
export class WishlistItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product!: Types.ObjectId;

  @Prop({ type: Date, required: true, default: Date.now })
  addedAt!: Date;
}

export const WishlistItemSchema = SchemaFactory.createForClass(WishlistItem);

@Schema({ collection: 'wishlists', timestamps: true, versionKey: false })
export class Wishlist {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user!: Types.ObjectId;

  @Prop({ type: [WishlistItemSchema], default: [] })
  items!: WishlistItem[];

  createdAt!: Date;
  updatedAt!: Date;
}

export const WishlistSchema = SchemaFactory.createForClass(Wishlist);
WishlistSchema.index({ user: 1 }, { unique: true });
