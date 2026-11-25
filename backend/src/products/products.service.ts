import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { BrandsService } from '../brands/brands.service';
import { CategoriesService } from '../categories/categories.service';
import {
  BikeType,
  ProductSort,
  ProductStatus,
  ProductType,
} from '../common/enums/catalog.enum';
import { OrderStatus } from '../common/enums/commerce.enum';
import {
  createPaginatedResult,
  PaginatedResult,
} from '../common/interfaces/pagination.interface';
import { assertNoUnexpectedNull } from '../common/utils/input-validation.util';
import { createSlug, escapeRegExp } from '../common/utils/slug.util';
import { AdminProductQueryDto } from './dto/admin-product-query.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { ProductVariantDto } from './dto/product-variant.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Order } from '../orders/schemas/order.schema';
import {
  Product,
  ProductDocument,
  ProductImage,
  ProductSpecification,
  ProductVariant,
} from './schemas/product.schema';

export interface ProductCategoryReference {
  id: string;
  name?: string;
  slug?: string;
}

export interface ProductBrandReference {
  id: string;
  name?: string;
  slug?: string;
  logoUrl?: string;
}

export interface ProductVariantResponse {
  id: string;
  color: string;
  colorHex?: string;
  size: string;
  sku: string;
  stock: number;
  priceAdjustment: number;
  price: number;
  imageUrl?: string;
}

export interface ProductResponse {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string;
  description: string;
  category: ProductCategoryReference;
  brand: ProductBrandReference;
  productType: ProductType;
  originalPrice: number;
  salePrice: number;
  images: ProductImage[];
  thumbnail: string;
  status: ProductStatus;
  featured: boolean;
  catalogOnly: boolean;
  bikeType?: BikeType;
  frameMaterial?: string;
  wheelSize?: string;
  weight?: string;
  specifications: ProductSpecification[];
  variants: ProductVariantResponse[];
  availableStock: number;
  averageRating: number;
  reviewCount: number;
  soldCount: number;
  isOnSale: boolean;
  discountPercent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductFacetValueResponse {
  value: string;
  count: number;
  colorHex?: string;
}

export interface ProductNameSuggestionResponse {
  id: string;
  name: string;
  slug: string;
  sku: string;
  thumbnail: string;
  salePrice: number;
}

export interface ProductFacetsResponse {
  priceRange?: {
    min: number;
    max: number;
  };
  colors: ProductFacetValueResponse[];
  sizes: ProductFacetValueResponse[];
  suggestions: ProductNameSuggestionResponse[];
}

/**
 * Live product data used by transactional modules such as Cart and Checkout.
 * The value is always resolved from the current Product document rather than
 * accepting a client-supplied price, title, or stock value.
 */
export interface ResolvedProductVariant {
  productId: string;
  productName: string;
  productSlug: string;
  productSku: string;
  thumbnail: string;
  variantId: string;
  color: string;
  colorHex?: string;
  size: string;
  sku: string;
  stock: number;
  unitPrice: number;
}

interface ProductQueryOptions {
  status?: ProductStatus;
  onlyActive?: boolean;
}

interface ProductRuleInput {
  catalogOnly?: boolean;
  productType: ProductType;
  originalPrice: number;
  salePrice: number;
  bikeType?: BikeType;
  frameMaterial?: string;
  wheelSize?: string;
  weight?: string;
  variants: ProductVariantDto[];
}

const CANCELLABLE_ORDER_STATUSES = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PACKING,
  OrderStatus.SHIPPING,
];

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    private readonly categoriesService: CategoriesService,
    private readonly brandsService: BrandsService,
  ) {}

  async findPublic(
    query: ProductQueryDto,
  ): Promise<PaginatedResult<ProductResponse[]>> {
    return this.findMany(query, { onlyActive: true });
  }

  async findPublicFacets(): Promise<ProductFacetsResponse> {
    const [publicCategoryIds, activeBrandIds] = await Promise.all([
      this.categoriesService.getPublicActiveIds(),
      this.brandsService.getActiveIds(),
    ]);

    const categoryIds = publicCategoryIds.filter(Boolean);
    const brandIds = activeBrandIds.filter(Boolean);

    if (!categoryIds.length || !brandIds.length) {
      return { colors: [], sizes: [], suggestions: [] };
    }

    const match = {
      status: ProductStatus.ACTIVE,
      category: { $in: categoryIds },
      brand: { $in: brandIds },
    };

    const [priceResults, colorResults, sizeResults, suggestions] = await Promise.all([
      this.productModel
        .aggregate<{ min?: number; max?: number }>([
          { $match: match },
          {
            $group: {
              _id: null,
              min: { $min: '$salePrice' },
              max: { $max: '$salePrice' },
            },
          },
        ])
        .exec(),
      this.productModel
        .aggregate<{ value: string; colorHex?: string; count: number }>([
          { $match: match },
          { $unwind: '$variants' },
          {
            $group: {
              _id: '$variants.color',
              colorHex: { $first: '$variants.colorHex' },
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              value: '$_id',
              colorHex: 1,
              count: 1,
            },
          },
          { $sort: { count: -1, value: 1 } },
          { $limit: 40 },
        ])
        .exec(),
      this.productModel
        .aggregate<{ value: string; count: number }>([
          { $match: match },
          { $unwind: '$variants' },
          {
            $group: {
              _id: '$variants.size',
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              value: '$_id',
              count: 1,
            },
          },
          { $sort: { count: -1, value: 1 } },
          { $limit: 40 },
        ])
        .exec(),
      this.productModel
        .find(match)
        .sort({ featured: -1, soldCount: -1, averageRating: -1, name: 1 })
        .limit(120)
        .select('_id name slug sku thumbnail salePrice')
        .lean()
        .exec(),
    ]);

    const price = priceResults[0];

    return {
      ...(price?.min !== undefined && price.max !== undefined
        ? { priceRange: { min: price.min, max: price.max } }
        : {}),
      colors: colorResults.filter((item) => Boolean(item.value?.trim())),
      sizes: sizeResults.filter((item) => Boolean(item.value?.trim())),
      suggestions: suggestions.map((product) => ({
        id: product._id.toString(),
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        thumbnail: product.thumbnail,
        salePrice: product.salePrice,
      })),
    };
  }

  async findAdmin(
    query: AdminProductQueryDto,
  ): Promise<PaginatedResult<ProductResponse[]>> {
    return this.findMany(query, { status: query.status });
  }

  async assertActiveProduct(productId: string): Promise<void> {
    const product = await this.productModel
      .findOne({ _id: productId, status: ProductStatus.ACTIVE })
      .select('category brand')
      .exec();

    if (!product) {
      throw new NotFoundException('Product is not available.');
    }

    await this.assertPublicReferences(product);
  }

  async findActiveByIds(productIds: string[]): Promise<ProductResponse[]> {
    const uniqueProductIds = [...new Set(productIds)];

    if (!uniqueProductIds.length) {
      return [];
    }

    const [categoryIds, brandIds] = await Promise.all([
      this.categoriesService.getPublicActiveIds(),
      this.brandsService.getActiveIds(),
    ]);

    if (!categoryIds.length || !brandIds.length) {
      return [];
    }

    const products = await this.productModel
      .find({
        _id: { $in: uniqueProductIds },
        status: ProductStatus.ACTIVE,
        category: { $in: categoryIds },
        brand: { $in: brandIds },
      })
      .populate(this.referencePopulation())
      .exec();
    const productsById = new Map(
      products.map((product) => [product._id.toString(), this.toResponse(product)]),
    );

    return uniqueProductIds.flatMap((productId) => {
      const product = productsById.get(productId);
      return product ? [product] : [];
    });
  }

  async resolveActiveVariant(
    productId: string,
    variantId: string,
  ): Promise<ResolvedProductVariant> {
    const product = await this.productModel
      .findOne({ _id: productId, status: ProductStatus.ACTIVE })
      .exec();

    if (!product) {
      throw new NotFoundException('Product is not available.');
    }

    if (product.catalogOnly) {
      throw new BadRequestException(
        'Sản phẩm đang được xác nhận thông tin bán hàng. Vui lòng liên hệ cửa hàng.',
      );
    }

    await this.assertPublicReferences(product);

    const variant = product.variants.find(
      (item) => item._id.toString() === variantId,
    );

    if (!variant) {
      throw new BadRequestException(
        'Product variant does not belong to the selected product.',
      );
    }

    return {
      productId: product._id.toString(),
      productName: product.name,
      productSlug: product.slug,
      productSku: product.sku,
      thumbnail: product.thumbnail,
      variantId: variant._id.toString(),
      color: variant.color,
      ...(variant.colorHex ? { colorHex: variant.colorHex } : {}),
      size: variant.size,
      sku: variant.sku,
      stock: variant.stock,
      unitPrice: product.salePrice + (variant.priceAdjustment ?? 0),
    };
  }

  async findPublicBySlug(slug: string): Promise<ProductResponse> {
    const product = await this.productModel
      .findOne({ slug: slug.toLowerCase(), status: ProductStatus.ACTIVE })
      .populate(this.referencePopulation())
      .exec();

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    await this.assertPublicReferences(product);

    return this.toResponse(product);
  }

  async findAdminById(productId: string): Promise<ProductResponse> {
    const product = await this.productModel
      .findById(productId)
      .populate(this.referencePopulation())
      .exec();

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    return this.toResponse(product);
  }

  async findRelatedBySlug(slug: string): Promise<ProductResponse[]> {
    const product = await this.productModel
      .findOne({ slug: slug.toLowerCase(), status: ProductStatus.ACTIVE })
      .select('_id category brand')
      .exec();

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    await this.assertPublicReferences(product);

    const activeBrandIds = await this.brandsService.getActiveIds();
    if (!activeBrandIds.length) {
      return [];
    }

    const relatedProducts = await this.productModel
      .find({
        _id: { $ne: product._id },
        category: product.category,
        status: ProductStatus.ACTIVE,
        brand: { $in: activeBrandIds },
      })
      .sort({ featured: -1, averageRating: -1, soldCount: -1, createdAt: -1 })
      .limit(4)
      .populate(this.referencePopulation())
      .exec();

    return relatedProducts.map((item) => this.toResponse(item));
  }

  async create(dto: CreateProductDto): Promise<ProductResponse> {
    await this.categoriesService.getActiveById(dto.category);
    await this.brandsService.getActiveById(dto.brand);

    const variants = this.normalizeVariants(dto.variants);
    this.assertProductRules({
      catalogOnly: dto.catalogOnly ?? false,
      productType: dto.productType,
      originalPrice: dto.originalPrice,
      salePrice: dto.salePrice,
      bikeType: dto.bikeType,
      frameMaterial: dto.frameMaterial,
      wheelSize: dto.wheelSize,
      weight: dto.weight,
      variants,
    });
    await this.assertSkusAvailable(dto.sku, variants);

    const product = await this.productModel.create({
      name: dto.name,
      slug: await this.createUniqueSlug(dto.slug ?? dto.name),
      sku: this.normalizeSku(dto.sku),
      shortDescription: dto.shortDescription,
      description: dto.description,
      category: dto.category,
      brand: dto.brand,
      productType: dto.productType,
      originalPrice: dto.originalPrice,
      salePrice: dto.salePrice,
      images: this.normalizeImages(dto.images),
      thumbnail: dto.thumbnail,
      status: dto.status ?? ProductStatus.ACTIVE,
      featured: dto.featured ?? false,
      catalogOnly: dto.catalogOnly ?? false,
      ...(dto.productType === ProductType.BICYCLE
        ? {
            bikeType: dto.bikeType,
            frameMaterial: dto.frameMaterial,
            wheelSize: dto.wheelSize,
            weight: dto.weight,
          }
        : {}),
      specifications: dto.specifications ?? [],
      variants,
    });

    return this.findAdminById(product._id.toString());
  }

  async update(
    productId: string,
    dto: UpdateProductDto,
  ): Promise<ProductResponse> {
    assertNoUnexpectedNull(dto);
    const product = await this.findDocumentById(productId);
    const variants = dto.variants
      ? this.normalizeVariants(dto.variants)
      : this.toVariantDtos(product.variants);
    const variantsWithStableIds = dto.variants
      ? this.preserveVariantIds(product.variants, variants)
      : undefined;
    const productType = dto.productType ?? product.productType;
    const originalPrice = dto.originalPrice ?? product.originalPrice;
    const salePrice = dto.salePrice ?? product.salePrice;
    const bikeType =
      productType === ProductType.ACCESSORY
        ? undefined
        : dto.bikeType ?? product.bikeType;
    const frameMaterial =
      productType === ProductType.ACCESSORY
        ? undefined
        : dto.frameMaterial ?? product.frameMaterial;
    const wheelSize =
      productType === ProductType.ACCESSORY
        ? undefined
        : dto.wheelSize ?? product.wheelSize;
    const weight =
      productType === ProductType.ACCESSORY
        ? undefined
        : dto.weight ?? product.weight;

    if (dto.category) {
      await this.categoriesService.getActiveById(dto.category);
    }

    if (dto.brand) {
      await this.brandsService.getActiveById(dto.brand);
    }

    this.assertProductRules({
      catalogOnly: dto.catalogOnly ?? product.catalogOnly ?? false,
      productType,
      originalPrice,
      salePrice,
      bikeType,
      frameMaterial,
      wheelSize,
      weight,
      variants,
    });
    await this.assertSkusAvailable(dto.sku ?? product.sku, variants, productId);

    if (variantsWithStableIds) {
      await this.assertNoCancellableOrderVariantIsRemoved(
        product._id,
        product.variants,
        variantsWithStableIds,
      );
    }

    const { slug } = dto;
    const changes = { ...dto };
    delete changes.slug;
    delete changes.variants;
    Object.assign(product, changes);

    if (slug) {
      product.slug = await this.createUniqueSlug(slug, productId);
    }

    if (dto.sku) {
      product.sku = this.normalizeSku(dto.sku);
    }

    if (dto.images) {
      product.images = this.normalizeImages(dto.images);
    }

    if (dto.variants) {
      product.variants = variantsWithStableIds as unknown as ProductVariant[];
    }

    if (productType === ProductType.ACCESSORY) {
      product.bikeType = undefined;
      product.frameMaterial = undefined;
      product.wheelSize = undefined;
      product.weight = undefined;
    }

    await product.save();
    return this.findAdminById(productId);
  }

  async upsertForSeed(dto: CreateProductDto): Promise<ProductResponse> {
    const existing = await this.productModel
      .findOne({ sku: this.normalizeSku(dto.sku) })
      .select('_id')
      .exec();

    if (existing) {
      return this.update(existing._id.toString(), dto);
    }

    return this.create(dto);
  }

  private async findMany(
    query: ProductQueryDto,
    options: ProductQueryOptions,
  ): Promise<PaginatedResult<ProductResponse[]>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;

    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    ) {
      throw new BadRequestException('minPrice must not be greater than maxPrice.');
    }

    const filter = await this.buildFilter(query, options);

    if (!filter) {
      return createPaginatedResult([], page, limit, 0);
    }

    const [products, total] = await Promise.all([
      this.productModel
        .find(filter)
        .sort(this.getSort(query.sort ?? ProductSort.NEWEST))
        .skip((page - 1) * limit)
        .limit(limit)
        .populate(this.referencePopulation())
        .exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    return createPaginatedResult(
      products.map((product) => this.toResponse(product)),
      page,
      limit,
      total,
    );
  }

  private async buildFilter(
    query: ProductQueryDto,
    options: ProductQueryOptions,
  ): Promise<FilterQuery<Product> | null> {
    const filter: Record<string, unknown> = {};

    if (options.onlyActive) {
      filter.status = ProductStatus.ACTIVE;
    } else if (options.status) {
      filter.status = options.status;
    }

    const [publicCategoryIds, activeBrandIds] = options.onlyActive
      ? await Promise.all([
          this.categoriesService.getPublicActiveIds(),
          this.brandsService.getActiveIds(),
        ])
      : [undefined, undefined];

    if (options.onlyActive && (!publicCategoryIds?.length || !activeBrandIds?.length)) {
      return null;
    }

    if (query.category) {
      const categoryIds = await this.categoriesService.getActiveDescendantIdsBySlug(
        query.category,
      );

      if (!categoryIds.length) {
        return null;
      }

      const allowedCategoryIds = options.onlyActive
        ? categoryIds.filter((categoryId) => publicCategoryIds?.includes(categoryId))
        : categoryIds;

      if (!allowedCategoryIds.length) {
        return null;
      }

      filter.category = { $in: allowedCategoryIds };
    } else if (options.onlyActive) {
      filter.category = { $in: publicCategoryIds };
    }

    if (query.brand) {
      const brandId = await this.brandsService.getActiveIdBySlug(query.brand);

      if (!brandId) {
        return null;
      }

      filter.brand = brandId;
    } else if (options.onlyActive) {
      filter.brand = { $in: activeBrandIds };
    }

    if (query.keyword) {
      const keyword = new RegExp(escapeRegExp(query.keyword), 'i');
      filter.$or = [
        { name: keyword },
        { shortDescription: keyword },
        { description: keyword },
        { sku: keyword },
        { 'variants.sku': keyword },
      ];
    }

    if (query.bikeType) {
      filter.bikeType = query.bikeType;
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      filter.salePrice = {
        ...(query.minPrice !== undefined ? { $gte: query.minPrice } : {}),
        ...(query.maxPrice !== undefined ? { $lte: query.maxPrice } : {}),
      };
    }

    if (query.onSale) {
      filter.$expr = { $lt: ['$salePrice', '$originalPrice'] };
      filter.catalogOnly = { $ne: true };
    }

    if (query.featured) {
      filter.featured = true;
    }

    const variantFilter: Record<string, unknown> = {};

    if (query.color) {
      variantFilter.color = new RegExp(`^${escapeRegExp(query.color)}$`, 'i');
    }

    if (query.size) {
      variantFilter.size = new RegExp(`^${escapeRegExp(query.size)}$`, 'i');
    }

    if (query.inStock) {
      filter.catalogOnly = { $ne: true };
      variantFilter.stock = { $gt: 0 };
    }

    if (Object.keys(variantFilter).length) {
      filter.variants = { $elemMatch: variantFilter };
    }

    return filter as FilterQuery<Product>;
  }

  private assertProductRules(input: ProductRuleInput): void {
    if (input.salePrice > input.originalPrice) {
      throw new BadRequestException(
        'salePrice must be less than or equal to originalPrice.',
      );
    }

    if (!input.catalogOnly && input.productType === ProductType.BICYCLE) {
      if (
        !input.bikeType ||
        !input.frameMaterial ||
        !input.wheelSize ||
        !input.weight
      ) {
        throw new BadRequestException(
          'bikeType, frameMaterial, wheelSize, and weight are required for bicycles.',
        );
      }
    }

    const skuSet = new Set<string>();
    const combinationSet = new Set<string>();

    if (!input.catalogOnly && !input.variants.length) {
      throw new BadRequestException('A product for sale must have at least one variant.');
    }

    for (const variant of input.variants) {
      const sku = this.normalizeSku(variant.sku);
      const color = variant.color.trim().toLowerCase();
      const size = variant.size.trim().toLowerCase();
      const combination = `${color}::${size}`;

      if (!input.catalogOnly && (!color || !size)) {
        throw new BadRequestException('Each variant for sale must have a color and size.');
      }

      if (skuSet.has(sku)) {
        throw new BadRequestException('Variant SKU values must be unique.');
      }

      if (color && size && combinationSet.has(combination)) {
        throw new BadRequestException(
          'Each color and size combination can only appear once.',
        );
      }

      if (input.salePrice + (variant.priceAdjustment ?? 0) < 0) {
        throw new BadRequestException('A variant price cannot be negative.');
      }

      skuSet.add(sku);
      if (color && size) combinationSet.add(combination);
    }
  }

  private async assertSkusAvailable(
    productSku: string,
    variants: ProductVariantDto[],
    excludeProductId?: string,
  ): Promise<void> {
    const skus = [productSku, ...variants.map((variant) => variant.sku)].map((sku) =>
      this.normalizeSku(sku),
    );

    if (new Set(skus).size !== skus.length) {
      throw new BadRequestException(
        'Product SKU and variant SKU values must all be unique.',
      );
    }

    const filter: Record<string, unknown> = {
      $or: [{ sku: { $in: skus } }, { 'variants.sku': { $in: skus } }],
    };

    if (excludeProductId) {
      filter._id = { $ne: excludeProductId };
    }

    const existing = await this.productModel.exists(filter).exec();

    if (existing) {
      throw new ConflictException('A product or variant SKU is already in use.');
    }
  }

  private async createUniqueSlug(
    value: string,
    excludeProductId?: string,
  ): Promise<string> {
    const baseSlug = createSlug(value);
    let candidate = baseSlug;
    let sequence = 2;

    while (true) {
      const filter: Record<string, unknown> = { slug: candidate };

      if (excludeProductId) {
        filter._id = { $ne: excludeProductId };
      }

      const exists = await this.productModel.exists(filter).exec();

      if (!exists) {
        return candidate;
      }

      candidate = `${baseSlug}-${sequence}`;
      sequence += 1;
    }
  }

  private async findDocumentById(productId: string): Promise<ProductDocument> {
    const product = await this.productModel.findById(productId).exec();

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    return product;
  }

  private normalizeVariants(variants: ProductVariantDto[]): ProductVariantDto[] {
    return variants.map((variant) => ({
      color: variant.color.trim(),
      ...(variant.colorHex ? { colorHex: variant.colorHex.toUpperCase() } : {}),
      size: variant.size.trim(),
      sku: this.normalizeSku(variant.sku),
      stock: variant.stock,
      priceAdjustment: variant.priceAdjustment ?? 0,
      ...(variant.imageUrl ? { imageUrl: variant.imageUrl.trim() } : {}),
    }));
  }

  private toVariantDtos(variants: ProductVariant[]): ProductVariantDto[] {
    return variants.map((variant) => ({
      color: variant.color,
      ...(variant.colorHex ? { colorHex: variant.colorHex } : {}),
      size: variant.size,
      sku: variant.sku,
      stock: variant.stock,
      priceAdjustment: variant.priceAdjustment ?? 0,
      ...(variant.imageUrl ? { imageUrl: variant.imageUrl } : {}),
    }));
  }

  private preserveVariantIds(
    existingVariants: ProductVariant[],
    incomingVariants: ProductVariantDto[],
  ): Array<ProductVariantDto & { _id?: Types.ObjectId }> {
    const existingBySku = new Map(
      existingVariants.map((variant) => [this.normalizeSku(variant.sku), variant]),
    );
    const existingByCombination = new Map(
      existingVariants.map((variant) => [
        this.variantCombinationKey(variant.color, variant.size),
        variant,
      ]),
    );

    // Reserve every SKU match first so a renamed variant cannot claim the ID
    // of another SKU that appears later in the incoming list.
    const skuMatches = incomingVariants.map((variant) =>
      existingBySku.get(this.normalizeSku(variant.sku)),
    );
    const claimedIds = new Set(
      skuMatches.flatMap((variant) => variant ? [variant._id.toString()] : []),
    );

    return incomingVariants.map((variant, index) => {
      let existing = skuMatches[index];
      if (!existing && variant.color.trim() && variant.size.trim()) {
        const combinationMatch = existingByCombination.get(
          this.variantCombinationKey(variant.color, variant.size),
        );
        if (combinationMatch && !claimedIds.has(combinationMatch._id.toString())) {
          existing = combinationMatch;
          claimedIds.add(combinationMatch._id.toString());
        }
      }

      return existing ? { ...variant, _id: existing._id } : variant;
    });
  }

  private async assertNoCancellableOrderVariantIsRemoved(
    productId: Types.ObjectId,
    existingVariants: ProductVariant[],
    nextVariants: Array<ProductVariantDto & { _id?: Types.ObjectId }>,
  ): Promise<void> {
    const retainedVariantIds = new Set(
      nextVariants.flatMap((variant) =>
        variant._id ? [variant._id.toString()] : [],
      ),
    );
    const removedVariantIds = existingVariants
      .filter((variant) => !retainedVariantIds.has(variant._id.toString()))
      .map((variant) => variant._id);

    if (!removedVariantIds.length) {
      return;
    }

    const orderUsingRemovedVariant = await this.orderModel
      .exists({
        orderStatus: { $in: CANCELLABLE_ORDER_STATUSES },
        items: {
          $elemMatch: {
            productId,
            variantId: { $in: removedVariantIds },
          },
        },
      })
      .exec();

    if (orderUsingRemovedVariant) {
      throw new ConflictException(
        'A variant in a cancellable order cannot be removed. Keep it until the order is completed or cancelled.',
      );
    }
  }

  private async assertPublicReferences(
    product: Pick<Product, 'category' | 'brand'>,
  ): Promise<void> {
    const categoryId = this.toReferenceId(product.category);
    const brandId = this.toReferenceId(product.brand);

    if (!categoryId || !brandId) {
      throw new NotFoundException('Product is not available.');
    }

    try {
      await Promise.all([
        this.categoriesService.getActiveById(categoryId),
        this.brandsService.getActiveById(brandId),
      ]);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new NotFoundException('Product is not available.');
      }

      throw error;
    }
  }

  private normalizeImages(images: CreateProductDto['images']): ProductImage[] {
    return images
      .map((image, index) => ({
        url: image.url.trim(),
        ...(image.alt ? { alt: image.alt.trim() } : {}),
        sortOrder: image.sortOrder ?? index,
      }))
      .sort((left, right) => left.sortOrder - right.sortOrder);
  }

  private normalizeSku(value: string): string {
    return value.trim().toUpperCase();
  }

  private variantCombinationKey(color: string, size: string): string {
    return `${color.trim().toLowerCase()}::${size.trim().toLowerCase()}`;
  }

  private getSort(sort: ProductSort): Record<string, 1 | -1> {
    // Imports can share timestamps, prices and ratings. A unique final key
    // keeps skip/limit pagination stable when the selected values are equal.
    switch (sort) {
      case ProductSort.OLDEST:
        return { createdAt: 1, _id: 1 };
      case ProductSort.PRICE_ASC:
        return { salePrice: 1, createdAt: -1, _id: -1 };
      case ProductSort.PRICE_DESC:
        return { salePrice: -1, createdAt: -1, _id: -1 };
      case ProductSort.BEST_SELLING:
        return { soldCount: -1, createdAt: -1, _id: -1 };
      case ProductSort.RATING_DESC:
        return { averageRating: -1, reviewCount: -1, createdAt: -1, _id: -1 };
      case ProductSort.NEWEST:
      default:
        return { featured: -1, createdAt: -1, _id: -1 };
    }
  }

  private referencePopulation() {
    return [
      { path: 'category', select: 'name slug' },
      { path: 'brand', select: 'name slug logoUrl' },
    ];
  }

  private toResponse(product: ProductDocument): ProductResponse {
    const variants = product.variants.map((variant) => {
      const priceAdjustment = variant.priceAdjustment ?? 0;

      return {
        id: variant._id.toString(),
        color: variant.color,
        ...(variant.colorHex ? { colorHex: variant.colorHex } : {}),
        size: variant.size,
        sku: variant.sku,
        stock: variant.stock,
        priceAdjustment,
        price: product.salePrice + priceAdjustment,
        ...(variant.imageUrl ? { imageUrl: variant.imageUrl } : {}),
      };
    });
    const availableStock = product.catalogOnly ? 0 : variants.reduce(
      (total, variant) => total + variant.stock,
      0,
    );
    const isOnSale = product.salePrice < product.originalPrice;
    const discountPercent =
      product.originalPrice > 0 && isOnSale
        ? Math.round(
            ((product.originalPrice - product.salePrice) / product.originalPrice) *
              100,
          )
        : 0;

    return {
      id: product._id.toString(),
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      shortDescription: product.shortDescription,
      description: product.description,
      category: this.toCategoryReference(product.category),
      brand: this.toBrandReference(product.brand),
      productType: product.productType,
      originalPrice: product.originalPrice,
      salePrice: product.salePrice,
      images: [...product.images].sort(
        (left, right) => left.sortOrder - right.sortOrder,
      ),
      thumbnail: product.thumbnail,
      status: product.status,
      featured: product.featured,
      catalogOnly: product.catalogOnly ?? false,
      ...(product.bikeType ? { bikeType: product.bikeType } : {}),
      ...(product.frameMaterial ? { frameMaterial: product.frameMaterial } : {}),
      ...(product.wheelSize ? { wheelSize: product.wheelSize } : {}),
      ...(product.weight ? { weight: product.weight } : {}),
      specifications: product.specifications ?? [],
      variants,
      availableStock,
      averageRating: product.averageRating,
      reviewCount: product.reviewCount,
      soldCount: product.soldCount,
      isOnSale,
      discountPercent,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  private toCategoryReference(value: unknown): ProductCategoryReference {
    const reference = value as {
      _id?: Types.ObjectId;
      name?: string;
      slug?: string;
      toString?: () => string;
    };

    return {
      id: this.toReferenceId(value),
      ...(reference.name ? { name: reference.name } : {}),
      ...(reference.slug ? { slug: reference.slug } : {}),
    };
  }

  private toBrandReference(value: unknown): ProductBrandReference {
    const reference = value as {
      _id?: Types.ObjectId;
      name?: string;
      slug?: string;
      logoUrl?: string;
      toString?: () => string;
    };

    return {
      id: this.toReferenceId(value),
      ...(reference.name ? { name: reference.name } : {}),
      ...(reference.slug ? { slug: reference.slug } : {}),
      ...(reference.logoUrl ? { logoUrl: reference.logoUrl } : {}),
    };
  }

  /**
   * A Product can be queried with raw ObjectIds or with populated Category and
   * Brand documents. Calling document.toString() serializes a populated
   * document instead of returning its identifier, so always unwrap `_id`
   * explicitly before querying reference collections.
   */
  private toReferenceId(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }

    if (value instanceof Types.ObjectId) {
      return value.toString();
    }

    if (value && typeof value === 'object' && '_id' in value) {
      const id = (value as { _id?: unknown })._id;
      if (id instanceof Types.ObjectId) {
        return id.toString();
      }
      if (typeof id === 'string') {
        return id;
      }
      if (id && typeof id === 'object' && 'toString' in id) {
        const toString = (id as { toString?: unknown }).toString;
        if (typeof toString === 'function') {
          return toString.call(id);
        }
      }
    }

    if (value && typeof value === 'object' && 'toString' in value) {
      const toString = (value as { toString?: unknown }).toString;
      if (typeof toString === 'function') {
        const result = toString.call(value);
        return result === '[object Object]' ? '' : result;
      }
    }

    return '';
  }
}
