import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { CartResponse, CartsService } from '../carts/carts.service';
import { ProductResponse, ProductsService } from '../products/products.service';
import { MoveWishlistToCartDto } from './dto/move-wishlist-to-cart.dto';
import {
  Wishlist,
  WishlistDocument,
  WishlistItem,
} from './schemas/wishlist.schema';

export interface WishlistItemResponse {
  product: ProductResponse;
  addedAt: Date;
}

export interface WishlistResponse {
  id?: string;
  items: WishlistItemResponse[];
  count: number;
}

export interface WishlistMoveToCartResponse {
  cart: CartResponse;
  wishlist: WishlistResponse;
}

@Injectable()
export class WishlistsService {
  constructor(
    @InjectModel(Wishlist.name)
    private readonly wishlistModel: Model<Wishlist>,
    private readonly productsService: ProductsService,
    private readonly cartsService: CartsService,
  ) {}

  async findMine(
    userId: string,
    session?: ClientSession,
  ): Promise<WishlistResponse> {
    const query = this.wishlistModel.findOne({ user: userId });
    if (session) query.session(session);
    const wishlist = await query.exec();

    if (!wishlist) {
      return this.emptyResponse();
    }

    const products = await this.productsService.findActiveByIds(
      wishlist.items.map((item) => item.product.toString()),
    );
    const productsById = new Map(
      products.map((product) => [product.id, product]),
    );
    const activeItems = wishlist.items.filter((item) =>
      productsById.has(item.product.toString()),
    );

    if (activeItems.length !== wishlist.items.length) {
      wishlist.items = activeItems;
      await wishlist.save(session ? { session } : undefined);
    }

    const items = activeItems.flatMap((item) => {
      const product = productsById.get(item.product.toString());
      return product ? [{ product, addedAt: item.addedAt }] : [];
    });

    return {
      id: wishlist._id.toString(),
      items,
      count: items.length,
    };
  }

  async add(userId: string, productId: string): Promise<WishlistResponse> {
    await this.productsService.assertActiveProduct(productId);
    const wishlist = await this.getOrCreateWishlist(userId);
    const exists = wishlist.items.some(
      (item) => item.product.toString() === productId,
    );

    if (!exists) {
      wishlist.items.push({
        product: new Types.ObjectId(productId),
        addedAt: new Date(),
      } as WishlistItem);
      await wishlist.save();
    }

    return this.findMine(userId);
  }

  async remove(userId: string, productId: string): Promise<WishlistResponse> {
    const wishlist = await this.wishlistModel.findOne({ user: userId }).exec();

    if (!wishlist) {
      return this.emptyResponse();
    }

    wishlist.items = wishlist.items.filter(
      (item) => item.product.toString() !== productId,
    );
    await wishlist.save();

    return this.findMine(userId);
  }

  async isWishlisted(userId: string, productId: string): Promise<{ isWishlisted: boolean }> {
    const wishlist = await this.wishlistModel
      .exists({ user: userId, 'items.product': productId })
      .exec();

    return { isWishlisted: Boolean(wishlist) };
  }

  async moveToCart(
    userId: string,
    productId: string,
    dto: MoveWishlistToCartDto,
  ): Promise<WishlistMoveToCartResponse> {
    const session = await this.wishlistModel.db.startSession();
    try {
      return await session.withTransaction(async () => {
        const wishlist = await this.wishlistModel
          .findOne({ user: userId })
          .session(session)
          .exec();
        const itemIndex = wishlist?.items.findIndex(
          (item) => item.product.toString() === productId,
        );

        if (!wishlist || itemIndex === undefined || itemIndex < 0) {
          throw new NotFoundException('Wishlist item not found.');
        }

        // Claim the wishlist item first. Concurrent moves retry this check;
        // any later failure rolls back both this removal and the cart change.
        wishlist.items.splice(itemIndex, 1);
        await wishlist.save({ session });

        // Prices, variant ownership and stock still come from ProductsService.
        const cart = await this.cartsService.addItem(
          userId,
          { productId, variantId: dto.variantId, quantity: dto.quantity },
          session,
        );

        return { cart, wishlist: await this.findMine(userId, session) };
      });
    } finally {
      await session.endSession();
    }
  }

  private async getOrCreateWishlist(userId: string): Promise<WishlistDocument> {
    const existingWishlist = await this.wishlistModel.findOne({ user: userId }).exec();

    if (existingWishlist) {
      return existingWishlist;
    }

    try {
      return await this.wishlistModel.create({ user: userId, items: [] });
    } catch (error) {
      const wishlistCreatedConcurrently = await this.wishlistModel
        .findOne({ user: userId })
        .exec();

      if (wishlistCreatedConcurrently) {
        return wishlistCreatedConcurrently;
      }

      throw error;
    }
  }

  private emptyResponse(): WishlistResponse {
    return { items: [], count: 0 };
  }
}
