import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createSlug } from '../common/utils/slug.util';
import { assertNoUnexpectedNull } from '../common/utils/input-validation.util';
import { Product } from '../products/schemas/product.schema';
import { Brand, BrandDocument } from './schemas/brand.schema';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

export interface BrandResponse {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class BrandsService {
  constructor(
    @InjectModel(Brand.name) private readonly brandModel: Model<Brand>,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
  ) {}

  async findPublicList(): Promise<BrandResponse[]> {
    const brands = await this.brandModel
      .find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .exec();

    return brands.map((brand) => this.toResponse(brand));
  }

  async findAdminList(): Promise<BrandResponse[]> {
    const brands = await this.brandModel
      .find()
      .sort({ sortOrder: 1, name: 1 })
      .exec();
    return brands.map((brand) => this.toResponse(brand));
  }

  async create(dto: CreateBrandDto): Promise<BrandResponse> {
    const brand = await this.brandModel.create({
      name: dto.name,
      slug: await this.createUniqueSlug(dto.slug ?? dto.name),
      ...(dto.description ? { description: dto.description } : {}),
      ...(dto.logoUrl ? { logoUrl: dto.logoUrl } : {}),
      ...(dto.website ? { website: dto.website } : {}),
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    });

    return this.toResponse(brand);
  }

  async update(brandId: string, dto: UpdateBrandDto): Promise<BrandResponse> {
    assertNoUnexpectedNull(dto, ['description', 'logoUrl', 'website']);
    const brand = await this.findDocumentById(brandId);
    const patch = dto as UpdateBrandDto & {
      description?: string | null;
      logoUrl?: string | null;
      website?: string | null;
    };
    if (dto.slug) {
      brand.slug = await this.createUniqueSlug(dto.slug, brandId);
    }

    if (dto.name !== undefined) {
      brand.name = dto.name;
    }
    if (dto.isActive !== undefined) {
      brand.isActive = dto.isActive;
    }
    if (dto.sortOrder !== undefined) {
      brand.sortOrder = dto.sortOrder;
    }
    if (patch.description !== undefined) {
      brand.description = this.toOptionalTrimmed(patch.description ?? undefined);
    }
    if (patch.logoUrl !== undefined) {
      brand.logoUrl = this.toOptionalTrimmed(patch.logoUrl ?? undefined);
    }
    if (patch.website !== undefined) {
      brand.website = this.toOptionalTrimmed(patch.website ?? undefined);
    }
    await brand.save();

    return this.toResponse(brand);
  }

  async remove(brandId: string): Promise<{ id: string }> {
    const brand = await this.findDocumentById(brandId);
    const hasProducts = await this.productModel.exists({ brand: brand._id });

    if (hasProducts) {
      throw new ConflictException(
        'Cannot delete a brand that is assigned to products. Disable it instead.',
      );
    }

    await brand.deleteOne();
    return { id: brandId };
  }

  async getActiveById(brandId: string): Promise<BrandDocument> {
    const brand = await this.brandModel
      .findOne({ _id: brandId, isActive: true })
      .exec();

    if (!brand) {
      throw new BadRequestException('Brand does not exist or is inactive.');
    }

    return brand;
  }

  async getActiveIdBySlug(slug: string): Promise<string | null> {
    const brand = await this.brandModel
      .findOne({ slug: slug.toLowerCase(), isActive: true })
      .select('_id')
      .lean()
      .exec();

    return brand?._id.toString() ?? null;
  }

  async getActiveIds(): Promise<string[]> {
    const brands = await this.brandModel
      .find({ isActive: true })
      .select('_id')
      .lean()
      .exec();

    return brands.map((brand) => brand._id.toString());
  }

  async upsertForSeed(input: {
    name: string;
    slug?: string;
    description?: string;
    logoUrl?: string;
    website?: string;
    isActive?: boolean;
    sortOrder?: number;
  }): Promise<BrandDocument> {
    const slug = createSlug(input.slug ?? input.name);
    const existing = await this.brandModel.findOne({ slug }).exec();
    const values = {
      ...input,
      slug,
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
    };

    if (existing) {
      Object.assign(existing, values);
      await existing.save();
      return existing;
    }

    return this.brandModel.create(values);
  }

  private async findDocumentById(brandId: string): Promise<BrandDocument> {
    const brand = await this.brandModel.findById(brandId).exec();

    if (!brand) {
      throw new NotFoundException('Brand not found.');
    }

    return brand;
  }

  private async createUniqueSlug(
    value: string,
    excludeBrandId?: string,
  ): Promise<string> {
    const baseSlug = createSlug(value);
    let candidate = baseSlug;
    let sequence = 2;

    while (true) {
      const filter: Record<string, unknown> = { slug: candidate };

      if (excludeBrandId) {
        filter._id = { $ne: excludeBrandId };
      }

      const exists = await this.brandModel.exists(filter).exec();

      if (!exists) {
        return candidate;
      }

      candidate = `${baseSlug}-${sequence}`;
      sequence += 1;
    }
  }

  private toOptionalTrimmed(value?: string): string | undefined {
    const normalized = value?.trim();
    return normalized || undefined;
  }

  private toResponse(brand: BrandDocument): BrandResponse {
    return {
      id: brand._id.toString(),
      name: brand.name,
      slug: brand.slug,
      ...(brand.description ? { description: brand.description } : {}),
      ...(brand.logoUrl ? { logoUrl: brand.logoUrl } : {}),
      ...(brand.website ? { website: brand.website } : {}),
      isActive: brand.isActive,
      sortOrder: brand.sortOrder,
      createdAt: brand.createdAt,
      updatedAt: brand.updatedAt,
    };
  }
}
