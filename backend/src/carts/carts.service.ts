import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ProductsService,
  ResolvedProductVariant,
} from '../products/products.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { Cart, CartDocument, CartItem } from './schemas/cart.schema';

const MAX_CART_ITEMS = 40;

export interface CartItemResponse {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  thumbnail: string;
  productSku: string;
  variantId: string;
  color: string;
  colorHex?: string;
  size: string;
  sku: string;
  stock: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isAvailable: boolean;
}

export interface CartResponse {
  id?: string;
  items: CartItemResponse[];
  totalItems: number;
  subtotal: number;
  hasUnavailableItems: boolean;
}

@Injectable()
export class CartsService {
  constructor(
    @InjectModel(Cart.name) private readonly cartModel: Model<Cart>,
    private readonly productsService: ProductsService,
  ) {}

  async findMine(userId: string): Promise<CartResponse> {
    const cart = await this.cartModel.findOne({ user: userId }).exec();
    return cart ? this.toResponse(cart) : this.emptyResponse();
  }

  async addItem(userId: string, dto: AddCartItemDto): Promise<CartResponse> {
    const resolvedVariant = await this.productsService.resolveActiveVariant(
      dto.productId,
      dto.variantId,
    );
    const cart = await this.getOrCreateCart(userId);
    const existingItem = cart.items.find(
      (item) =>
        item.product.toString() === resolvedVariant.productId &&
        item.variantId.toString() === resolvedVariant.variantId,
    );
    const nextQuantity = (existingItem?.quantity ?? 0) + dto.quantity;

    this.assertStock(resolvedVariant, nextQuantity);

    if (existingItem) {
      existingItem.quantity = nextQuantity;
      this.syncSnapshot(existingItem, resolvedVariant);
    } else {
      if (cart.items.length >= MAX_CART_ITEMS) {
        throw new BadRequestException(
          `A cart can contain at most ${MAX_CART_ITEMS} different variants.`,
        );
      }

      cart.items.push(this.createCartItem(resolvedVariant, dto.quantity));
    }

    await cart.save();
    return this.toResponse(cart);
  }

  async updateItem(
    userId: string,
    itemId: string,
    dto: UpdateCartItemDto,
  ): Promise<CartResponse> {
    const cart = await this.findCartWithItem(userId, itemId);
    const item = cart.items.find((candidate) => candidate._id.toString() === itemId);

    if (!item) {
      throw new NotFoundException('Cart item not found.');
    }

    const resolvedVariant = await this.productsService.resolveActiveVariant(
      item.product.toString(),
      item.variantId.toString(),
    );
    this.assertStock(resolvedVariant, dto.quantity);

    item.quantity = dto.quantity;
    this.syncSnapshot(item, resolvedVariant);
    await cart.save();

    return this.toResponse(cart);
  }

  async removeItem(
    userId: string,
    itemId: string,
  ): Promise<CartResponse> {
    const cart = await this.findCartWithItem(userId, itemId);
    const itemIndex = cart.items.findIndex(
      (candidate) => candidate._id.toString() === itemId,
    );

    if (itemIndex === -1) {
      throw new NotFoundException('Cart item not found.');
    }

    cart.items.splice(itemIndex, 1);
    await cart.save();

    return this.toResponse(cart);
  }

  async clearMine(userId: string): Promise<CartResponse> {
    const cart = await this.cartModel.findOne({ user: userId }).exec();

    if (!cart) {
      return this.emptyResponse();
    }

    cart.items = [];
    await cart.save();
    return this.toResponse(cart);
  }

  private async getOrCreateCart(userId: string): Promise<CartDocument> {
    const existingCart = await this.cartModel.findOne({ user: userId }).exec();

    if (existingCart) {
      return existingCart;
    }

    try {
      return await this.cartModel.create({ user: userId, items: [] });
    } catch (error) {
      // The unique user index protects concurrent first add-to-cart requests.
      const cartCreatedConcurrently = await this.cartModel
        .findOne({ user: userId })
        .exec();

      if (cartCreatedConcurrently) {
        return cartCreatedConcurrently;
      }

      throw error;
    }
  }

  private async findCartWithItem(
    userId: string,
    itemId: string,
  ): Promise<CartDocument> {
    const cart = await this.cartModel
      .findOne({ user: userId, 'items._id': itemId })
      .exec();

    if (!cart) {
      throw new NotFoundException('Cart item not found.');
    }

    return cart;
  }

  private assertStock(
    variant: ResolvedProductVariant,
    quantity: number,
  ): void {
    if (variant.stock < quantity) {
      throw new BadRequestException(
        `Only ${variant.stock} item(s) are available for ${variant.color} / ${variant.size}.`,
      );
    }
  }

  private createCartItem(
    variant: ResolvedProductVariant,
    quantity: number,
  ): CartItem {
    return {
      _id: new Types.ObjectId(),
      product: new Types.ObjectId(variant.productId),
      variantId: new Types.ObjectId(variant.variantId),
      quantity,
      productName: variant.productName,
      productSlug: variant.productSlug,
      thumbnail: variant.thumbnail,
      variantColor: variant.color,
      ...(variant.colorHex ? { variantColorHex: variant.colorHex } : {}),
      variantSize: variant.size,
      variantSku: variant.sku,
      lastKnownUnitPrice: variant.unitPrice,
    };
  }

  private syncSnapshot(item: CartItem, variant: ResolvedProductVariant): void {
    item.productName = variant.productName;
    item.productSlug = variant.productSlug;
    item.thumbnail = variant.thumbnail;
    item.variantColor = variant.color;
    item.variantColorHex = variant.colorHex;
    item.variantSize = variant.size;
    item.variantSku = variant.sku;
    item.lastKnownUnitPrice = variant.unitPrice;
  }

  private async toResponse(cart: CartDocument): Promise<CartResponse> {
    const items = await Promise.all(
      cart.items.map((item) => this.toItemResponse(item)),
    );

    return {
      id: cart._id.toString(),
      items,
      totalItems: items.reduce((total, item) => total + item.quantity, 0),
      subtotal: items.reduce((total, item) => total + item.totalPrice, 0),
      hasUnavailableItems: items.some((item) => !item.isAvailable),
    };
  }

  private async toItemResponse(item: CartItem): Promise<CartItemResponse> {
    try {
      const currentVariant = await this.productsService.resolveActiveVariant(
        item.product.toString(),
        item.variantId.toString(),
      );
      const isAvailable = currentVariant.stock >= item.quantity;

      return {
        id: item._id.toString(),
        productId: currentVariant.productId,
        productName: currentVariant.productName,
        productSlug: currentVariant.productSlug,
        thumbnail: currentVariant.thumbnail,
        productSku: currentVariant.productSku,
        variantId: currentVariant.variantId,
        color: currentVariant.color,
        ...(currentVariant.colorHex ? { colorHex: currentVariant.colorHex } : {}),
        size: currentVariant.size,
        sku: currentVariant.sku,
        stock: currentVariant.stock,
        quantity: item.quantity,
        unitPrice: currentVariant.unitPrice,
        totalPrice: currentVariant.unitPrice * item.quantity,
        isAvailable,
      };
    } catch (error) {
      if (!(error instanceof BadRequestException || error instanceof NotFoundException)) {
        throw error;
      }

      return {
        id: item._id.toString(),
        productId: item.product.toString(),
        productName: item.productName,
        productSlug: item.productSlug,
        thumbnail: item.thumbnail,
        productSku: '',
        variantId: item.variantId.toString(),
        color: item.variantColor,
        ...(item.variantColorHex ? { colorHex: item.variantColorHex } : {}),
        size: item.variantSize,
        sku: item.variantSku,
        stock: 0,
        quantity: item.quantity,
        unitPrice: item.lastKnownUnitPrice,
        totalPrice: item.lastKnownUnitPrice * item.quantity,
        isAvailable: false,
      };
    }
  }

  private emptyResponse(): CartResponse {
    return {
      items: [],
      totalItems: 0,
      subtotal: 0,
      hasUnavailableItems: false,
    };
  }
}
