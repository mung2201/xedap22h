import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { Address, AddressDocument } from '../addresses/schemas/address.schema';
import { BrandsService } from '../brands/brands.service';
import { Cart, CartDocument } from '../carts/schemas/cart.schema';
import { CategoriesService } from '../categories/categories.service';
import { ShippingMethod } from '../common/enums/commerce.enum';
import { ProductStatus } from '../common/enums/catalog.enum';
import { Product } from '../products/schemas/product.schema';
import { ResolvedVoucher, VouchersService } from '../vouchers/vouchers.service';
import { CheckoutPreviewDto } from './dto/checkout-preview.dto';

export interface ShippingAddressSnapshot {
  recipientName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  addressLine: string;
  note?: string;
}

export interface CheckoutItemSnapshot {
  productId: string;
  categoryId: string;
  variantId: string;
  name: string;
  slug: string;
  productSku: string;
  image: string;
  color: string;
  colorHex?: string;
  size: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PreparedCheckout {
  cartId: string;
  shippingAddress: ShippingAddressSnapshot;
  items: CheckoutItemSnapshot[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  shippingMethod: ShippingMethod;
  voucher?: ResolvedVoucher;
}

@Injectable()
export class CheckoutService {
  constructor(
    @InjectModel(Cart.name) private readonly cartModel: Model<Cart>,
    @InjectModel(Address.name) private readonly addressModel: Model<Address>,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    private readonly categoriesService: CategoriesService,
    private readonly brandsService: BrandsService,
    private readonly vouchersService: VouchersService,
    private readonly configService: ConfigService,
  ) {}

  async preview(
    userId: string,
    dto: CheckoutPreviewDto,
  ): Promise<PreparedCheckout> {
    return this.prepare(userId, dto);
  }

  async prepare(
    userId: string,
    dto: CheckoutPreviewDto,
    session?: ClientSession,
  ): Promise<PreparedCheckout> {
    const [cart, address] = await Promise.all([
      this.findCart(userId, session),
      this.findAddress(userId, dto.addressId, session),
    ]);

    if (!cart.items.length) {
      throw new BadRequestException('Cart is empty.');
    }

    const productIds = [...new Set(cart.items.map((item) => item.product.toString()))];
    const productsQuery = this.productModel.find({
      _id: { $in: productIds },
      status: ProductStatus.ACTIVE,
    });
    if (session) {
      productsQuery.session(session);
    }
    const products = await productsQuery.exec();
    const productsById = new Map(
      products.map((product) => [product._id.toString(), product]),
    );

    const [publicCategoryIds, activeBrandIds] = await Promise.all([
      this.categoriesService.getPublicActiveIds(),
      this.brandsService.getActiveIds(),
    ]);
    const publicCategoryIdSet = new Set(publicCategoryIds);
    const activeBrandIdSet = new Set(activeBrandIds);

    const items = cart.items.map((cartItem): CheckoutItemSnapshot => {
      const product = productsById.get(cartItem.product.toString());

      if (
        !product ||
        !publicCategoryIdSet.has(product.category.toString()) ||
        !activeBrandIdSet.has(product.brand.toString())
      ) {
        throw new BadRequestException(
          `Product ${cartItem.productName} is no longer available.`,
        );
      }

      const variant = product.variants.find(
        (candidate) => candidate._id.toString() === cartItem.variantId.toString(),
      );

      if (!variant) {
        throw new BadRequestException(
          `A selected variant of ${product.name} is no longer available.`,
        );
      }

      if (variant.stock < cartItem.quantity) {
        throw new BadRequestException(
          `Only ${variant.stock} item(s) are available for ${product.name} (${variant.color} / ${variant.size}).`,
        );
      }

      const unitPrice = product.salePrice + (variant.priceAdjustment ?? 0);

      return {
        productId: product._id.toString(),
        categoryId: product.category.toString(),
        variantId: variant._id.toString(),
        name: product.name,
        slug: product.slug,
        productSku: product.sku,
        image: variant.imageUrl ?? product.thumbnail,
        color: variant.color,
        ...(variant.colorHex ? { colorHex: variant.colorHex } : {}),
        size: variant.size,
        sku: variant.sku,
        quantity: cartItem.quantity,
        unitPrice,
        totalPrice: unitPrice * cartItem.quantity,
      };
    });
    const subtotal = items.reduce((total, item) => total + item.totalPrice, 0);
    const voucher = await this.vouchersService.resolveForSubtotal(
      dto.voucherCode,
      subtotal,
      session,
    );
    const discount = voucher?.discountAmount ?? 0;
    const shippingFee = this.calculateShippingFee(dto.shippingMethod, subtotal);

    return {
      cartId: cart._id.toString(),
      shippingAddress: this.toShippingAddress(address),
      items,
      subtotal,
      discount,
      shippingFee,
      total: Math.max(0, subtotal - discount + shippingFee),
      shippingMethod: dto.shippingMethod,
      ...(voucher ? { voucher } : {}),
    };
  }

  private async findCart(
    userId: string,
    session?: ClientSession,
  ): Promise<CartDocument> {
    const query = this.cartModel.findOne({ user: userId });
    if (session) {
      query.session(session);
    }
    const cart = await query.exec();

    if (!cart) {
      throw new BadRequestException('Cart is empty.');
    }

    return cart;
  }

  private async findAddress(
    userId: string,
    addressId: string,
    session?: ClientSession,
  ): Promise<AddressDocument> {
    const query = this.addressModel.findOne({ _id: addressId, user: userId });
    if (session) {
      query.session(session);
    }
    const address = await query.exec();

    if (!address) {
      throw new NotFoundException('Delivery address not found.');
    }

    return address;
  }

  private calculateShippingFee(
    shippingMethod: ShippingMethod,
    subtotal: number,
  ): number {
    const freeShippingMinOrder = this.configService.getOrThrow<number>(
      'checkout.freeShippingMinOrder',
    );

    if (freeShippingMinOrder > 0 && subtotal >= freeShippingMinOrder) {
      return 0;
    }

    switch (shippingMethod) {
      case ShippingMethod.EXPRESS:
        return this.configService.getOrThrow<number>('checkout.expressShippingFee');
      case ShippingMethod.STANDARD:
      default:
        return this.configService.getOrThrow<number>('checkout.standardShippingFee');
    }
  }

  private toShippingAddress(address: AddressDocument): ShippingAddressSnapshot {
    return {
      recipientName: address.recipientName,
      phone: address.phone,
      province: address.province,
      district: address.district,
      ward: address.ward,
      addressLine: address.addressLine,
      ...(address.note ? { note: address.note } : {}),
    };
  }
}
