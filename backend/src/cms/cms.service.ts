import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  BannerPosition,
  BannerType,
  PageStatus,
} from '../common/enums/cms.enum';
import {
  createPaginatedResult,
  PaginatedResult,
} from '../common/interfaces/pagination.interface';
import { assertNoUnexpectedNull } from '../common/utils/input-validation.util';
import { createSlug, escapeRegExp } from '../common/utils/slug.util';
import { BannerQueryDto, PublicBannerQueryDto } from './dto/banner-query.dto';
import { CreateBannerDto } from './dto/create-banner.dto';
import { CreateStaticPageDto } from './dto/create-static-page.dto';
import { StaticPageQueryDto } from './dto/static-page-query.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { UpdateStaticPageDto } from './dto/update-static-page.dto';
import { Banner, BannerDocument } from './schemas/banner.schema';
import {
  StaticPage,
  StaticPageDocument,
} from './schemas/static-page.schema';

export interface BannerResponse {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  mobileImageUrl?: string;
  link?: string;
  buttonLabel?: string;
  openInNewTab: boolean;
  type: BannerType;
  position: BannerPosition;
  sortOrder: number;
  active: boolean;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface StaticPageResponse {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  status: PageStatus;
  seoTitle?: string;
  seoDescription?: string;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface NormalizedBannerInput {
  title: string;
  subtitle?: string;
  imageUrl: string;
  mobileImageUrl?: string;
  link?: string;
  buttonLabel?: string;
  openInNewTab: boolean;
  type: BannerType;
  position: BannerPosition;
  sortOrder: number;
  active: boolean;
  startDate?: Date;
  endDate?: Date;
}

interface NormalizedStaticPageInput {
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  status: PageStatus;
  seoTitle?: string;
  seoDescription?: string;
}

@Injectable()
export class CmsService {
  constructor(
    @InjectModel(Banner.name) private readonly bannerModel: Model<Banner>,
    @InjectModel(StaticPage.name)
    private readonly staticPageModel: Model<StaticPage>,
  ) {}

  async findPublicBanners(
    query: PublicBannerQueryDto = {},
  ): Promise<BannerResponse[]> {
    const now = new Date();
    const filter: Record<string, unknown> = {
      active: true,
      ...(query.type ? { type: query.type } : {}),
      ...(query.position ? { position: query.position } : {}),
      $and: [
        {
          $or: [
            { startDate: { $exists: false } },
            { startDate: null },
            { startDate: { $lte: now } },
          ],
        },
        {
          $or: [
            { endDate: { $exists: false } },
            { endDate: null },
            { endDate: { $gte: now } },
          ],
        },
      ],
    };

    const banners = await this.bannerModel
      .find(filter)
      .sort({ sortOrder: 1, createdAt: -1 })
      .exec();

    return banners.map((banner) => this.toBannerResponse(banner));
  }

  async findAdminBanners(
    query: BannerQueryDto,
  ): Promise<PaginatedResult<BannerResponse[]>> {
    const filter: Record<string, unknown> = {
      ...(query.type ? { type: query.type } : {}),
      ...(query.position ? { position: query.position } : {}),
      ...(query.active !== undefined ? { active: query.active } : {}),
    };

    if (query.keyword) {
      const keyword = new RegExp(escapeRegExp(query.keyword), 'i');
      filter.$or = [{ title: keyword }, { subtitle: keyword }];
    }

    const [banners, total] = await Promise.all([
      this.bannerModel
        .find(filter)
        .sort({ type: 1, position: 1, sortOrder: 1, createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .exec(),
      this.bannerModel.countDocuments(filter).exec(),
    ]);

    return createPaginatedResult(
      banners.map((banner) => this.toBannerResponse(banner)),
      query.page,
      query.limit,
      total,
    );
  }

  async findAdminBannerById(bannerId: string): Promise<BannerResponse> {
    const banner = await this.findBannerDocumentById(bannerId);
    return this.toBannerResponse(banner);
  }

  async createBanner(
    dto: CreateBannerDto,
    actorId?: string,
  ): Promise<BannerResponse> {
    const input = this.normalizeBannerCreateInput(dto);
    this.assertBannerSchedule(input.startDate, input.endDate);

    const actor = actorId ? new Types.ObjectId(actorId) : undefined;
    const banner = await this.bannerModel.create({
      ...input,
      ...(actor ? { createdBy: actor, updatedBy: actor } : {}),
    });

    return this.toBannerResponse(banner);
  }

  async updateBanner(
    bannerId: string,
    dto: UpdateBannerDto,
    actorId?: string,
  ): Promise<BannerResponse> {
    assertNoUnexpectedNull(dto, [
      'subtitle',
      'mobileImageUrl',
      'link',
      'buttonLabel',
      'startDate',
      'endDate',
    ]);
    const banner = await this.findBannerDocumentById(bannerId);
    const patch = dto as UpdateBannerDto & {
      subtitle?: string | null;
      mobileImageUrl?: string | null;
      link?: string | null;
      buttonLabel?: string | null;
      startDate?: Date | null;
      endDate?: Date | null;
    };
    const startDate =
      patch.startDate === null ? undefined : patch.startDate ?? banner.startDate;
    const endDate =
      patch.endDate === null ? undefined : patch.endDate ?? banner.endDate;
    this.assertBannerSchedule(startDate, endDate);

    if (dto.title !== undefined) {
      banner.title = dto.title.trim();
    }
    if (patch.subtitle !== undefined) {
      banner.subtitle = this.toOptionalTrimmed(patch.subtitle ?? undefined);
    }
    if (dto.imageUrl !== undefined) {
      banner.imageUrl = dto.imageUrl.trim();
    }
    if (patch.mobileImageUrl !== undefined) {
      banner.mobileImageUrl = this.toOptionalTrimmed(
        patch.mobileImageUrl ?? undefined,
      );
    }
    if (patch.link !== undefined) {
      banner.link = this.toOptionalTrimmed(patch.link ?? undefined);
    }
    if (patch.buttonLabel !== undefined) {
      banner.buttonLabel = this.toOptionalTrimmed(patch.buttonLabel ?? undefined);
    }
    if (dto.openInNewTab !== undefined) {
      banner.openInNewTab = dto.openInNewTab;
    }
    if (dto.type !== undefined) {
      banner.type = dto.type;
    }
    if (dto.position !== undefined) {
      banner.position = dto.position;
    }
    if (dto.sortOrder !== undefined) {
      banner.sortOrder = dto.sortOrder;
    }
    if (dto.active !== undefined) {
      banner.active = dto.active;
    }
    if (patch.startDate !== undefined) {
      banner.startDate = patch.startDate ?? undefined;
    }
    if (patch.endDate !== undefined) {
      banner.endDate = patch.endDate ?? undefined;
    }
    if (actorId) {
      banner.updatedBy = new Types.ObjectId(actorId);
    }

    await banner.save();
    return this.toBannerResponse(banner);
  }

  async removeBanner(bannerId: string): Promise<{ id: string }> {
    const banner = await this.findBannerDocumentById(bannerId);
    await banner.deleteOne();
    return { id: bannerId };
  }

  async findPublicPages(): Promise<StaticPageResponse[]> {
    const pages = await this.staticPageModel
      .find({ status: PageStatus.PUBLISHED })
      .sort({ publishedAt: -1, createdAt: -1 })
      .exec();

    return pages.map((page) => this.toStaticPageResponse(page));
  }

  async findPublicPageBySlug(slug: string): Promise<StaticPageResponse> {
    const page = await this.staticPageModel
      .findOne({ slug: this.normalizeSlug(slug), status: PageStatus.PUBLISHED })
      .exec();

    if (!page) {
      throw new NotFoundException('Published page not found.');
    }

    return this.toStaticPageResponse(page);
  }

  async findAdminPages(
    query: StaticPageQueryDto,
  ): Promise<PaginatedResult<StaticPageResponse[]>> {
    const filter: Record<string, unknown> = {
      ...(query.status ? { status: query.status } : {}),
    };

    if (query.keyword) {
      const keyword = new RegExp(escapeRegExp(query.keyword), 'i');
      filter.$or = [{ title: keyword }, { slug: keyword }];
    }

    const [pages, total] = await Promise.all([
      this.staticPageModel
        .find(filter)
        .sort({ status: 1, updatedAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .exec(),
      this.staticPageModel.countDocuments(filter).exec(),
    ]);

    return createPaginatedResult(
      pages.map((page) => this.toStaticPageResponse(page)),
      query.page,
      query.limit,
      total,
    );
  }

  async findAdminPageById(pageId: string): Promise<StaticPageResponse> {
    const page = await this.findStaticPageDocumentById(pageId);
    return this.toStaticPageResponse(page);
  }

  async createStaticPage(
    dto: CreateStaticPageDto,
    actorId?: string,
  ): Promise<StaticPageResponse> {
    const input = this.normalizeStaticPageCreateInput(dto);
    await this.assertStaticPageSlugAvailable(input.slug);

    const actor = actorId ? new Types.ObjectId(actorId) : undefined;
    const page = await this.staticPageModel.create({
      ...input,
      ...(input.status === PageStatus.PUBLISHED ? { publishedAt: new Date() } : {}),
      ...(actor ? { createdBy: actor, updatedBy: actor } : {}),
    });

    return this.toStaticPageResponse(page);
  }

  async updateStaticPage(
    pageId: string,
    dto: UpdateStaticPageDto,
    actorId?: string,
  ): Promise<StaticPageResponse> {
    assertNoUnexpectedNull(dto, ['excerpt', 'seoTitle', 'seoDescription']);
    const page = await this.findStaticPageDocumentById(pageId);

    if (dto.title !== undefined) {
      page.title = dto.title.trim();
    }
    if (dto.slug !== undefined) {
      const slug = this.normalizeSlug(dto.slug);
      await this.assertStaticPageSlugAvailable(slug, pageId);
      page.slug = slug;
    }
    if (dto.excerpt !== undefined) {
      page.excerpt = this.toOptionalTrimmed(dto.excerpt);
    }
    if (dto.content !== undefined) {
      page.content = dto.content.trim();
    }
    if (dto.status !== undefined) {
      if (
        dto.status === PageStatus.PUBLISHED &&
        page.status !== PageStatus.PUBLISHED
      ) {
        page.publishedAt = new Date();
      }
      page.status = dto.status;
    }
    if (dto.seoTitle !== undefined) {
      page.seoTitle = this.toOptionalTrimmed(dto.seoTitle);
    }
    if (dto.seoDescription !== undefined) {
      page.seoDescription = this.toOptionalTrimmed(dto.seoDescription);
    }
    if (actorId) {
      page.updatedBy = new Types.ObjectId(actorId);
    }

    await page.save();
    return this.toStaticPageResponse(page);
  }

  async removeStaticPage(pageId: string): Promise<{ id: string }> {
    const page = await this.findStaticPageDocumentById(pageId);
    await page.deleteOne();
    return { id: pageId };
  }

  async upsertBannerForSeed(dto: CreateBannerDto): Promise<BannerResponse> {
    const type = dto.type ?? BannerType.SLIDER;
    const position = dto.position ?? BannerPosition.HOME_HERO;
    const existing = await this.bannerModel
      .findOne({ title: dto.title.trim(), type, position })
      .exec();

    return existing
      ? this.updateBanner(existing._id.toString(), dto)
      : this.createBanner(dto);
  }

  async upsertStaticPageForSeed(
    dto: CreateStaticPageDto,
  ): Promise<StaticPageResponse> {
    const slug = this.normalizeSlug(dto.slug ?? dto.title);
    const existing = await this.staticPageModel.findOne({ slug }).exec();

    return existing
      ? this.updateStaticPage(existing._id.toString(), { ...dto, slug })
      : this.createStaticPage({ ...dto, slug });
  }

  private normalizeBannerCreateInput(dto: CreateBannerDto): NormalizedBannerInput {
    return {
      title: dto.title.trim(),
      ...(this.toOptionalTrimmed(dto.subtitle)
        ? { subtitle: this.toOptionalTrimmed(dto.subtitle) }
        : {}),
      imageUrl: dto.imageUrl.trim(),
      ...(this.toOptionalTrimmed(dto.mobileImageUrl)
        ? { mobileImageUrl: this.toOptionalTrimmed(dto.mobileImageUrl) }
        : {}),
      ...(this.toOptionalTrimmed(dto.link)
        ? { link: this.toOptionalTrimmed(dto.link) }
        : {}),
      ...(this.toOptionalTrimmed(dto.buttonLabel)
        ? { buttonLabel: this.toOptionalTrimmed(dto.buttonLabel) }
        : {}),
      openInNewTab: dto.openInNewTab ?? false,
      type: dto.type ?? BannerType.SLIDER,
      position: dto.position ?? BannerPosition.HOME_HERO,
      sortOrder: dto.sortOrder ?? 0,
      active: dto.active ?? true,
      ...(dto.startDate ? { startDate: dto.startDate } : {}),
      ...(dto.endDate ? { endDate: dto.endDate } : {}),
    };
  }

  private normalizeStaticPageCreateInput(
    dto: CreateStaticPageDto,
  ): NormalizedStaticPageInput {
    return {
      title: dto.title.trim(),
      slug: this.normalizeSlug(dto.slug ?? dto.title),
      ...(this.toOptionalTrimmed(dto.excerpt)
        ? { excerpt: this.toOptionalTrimmed(dto.excerpt) }
        : {}),
      content: dto.content.trim(),
      status: dto.status ?? PageStatus.DRAFT,
      ...(this.toOptionalTrimmed(dto.seoTitle)
        ? { seoTitle: this.toOptionalTrimmed(dto.seoTitle) }
        : {}),
      ...(this.toOptionalTrimmed(dto.seoDescription)
        ? { seoDescription: this.toOptionalTrimmed(dto.seoDescription) }
        : {}),
    };
  }

  private async findBannerDocumentById(
    bannerId: string,
  ): Promise<BannerDocument> {
    const banner = await this.bannerModel.findById(bannerId).exec();
    if (!banner) {
      throw new NotFoundException('Banner not found.');
    }
    return banner;
  }

  private async findStaticPageDocumentById(
    pageId: string,
  ): Promise<StaticPageDocument> {
    const page = await this.staticPageModel.findById(pageId).exec();
    if (!page) {
      throw new NotFoundException('Static page not found.');
    }
    return page;
  }

  private async assertStaticPageSlugAvailable(
    slug: string,
    excludedPageId?: string,
  ): Promise<void> {
    const exists = await this.staticPageModel
      .exists({
        slug,
        ...(excludedPageId ? { _id: { $ne: excludedPageId } } : {}),
      })
      .exec();

    if (exists) {
      throw new ConflictException('Page slug is already in use.');
    }
  }

  private assertBannerSchedule(startDate?: Date, endDate?: Date): void {
    if (startDate && endDate && startDate >= endDate) {
      throw new BadRequestException('Banner endDate must be after startDate.');
    }
  }

  private normalizeSlug(value: string): string {
    return createSlug(value);
  }

  private toOptionalTrimmed(value?: string): string | undefined {
    const normalized = value?.trim();
    return normalized || undefined;
  }

  private toBannerResponse(banner: BannerDocument): BannerResponse {
    return {
      id: banner._id.toString(),
      title: banner.title,
      ...(banner.subtitle ? { subtitle: banner.subtitle } : {}),
      imageUrl: banner.imageUrl,
      ...(banner.mobileImageUrl
        ? { mobileImageUrl: banner.mobileImageUrl }
        : {}),
      ...(banner.link ? { link: banner.link } : {}),
      ...(banner.buttonLabel ? { buttonLabel: banner.buttonLabel } : {}),
      openInNewTab: banner.openInNewTab,
      type: banner.type,
      position: banner.position,
      sortOrder: banner.sortOrder,
      active: banner.active,
      ...(banner.startDate ? { startDate: banner.startDate } : {}),
      ...(banner.endDate ? { endDate: banner.endDate } : {}),
      createdAt: banner.createdAt,
      updatedAt: banner.updatedAt,
    };
  }

  private toStaticPageResponse(page: StaticPageDocument): StaticPageResponse {
    return {
      id: page._id.toString(),
      title: page.title,
      slug: page.slug,
      ...(page.excerpt ? { excerpt: page.excerpt } : {}),
      content: page.content,
      status: page.status,
      ...(page.seoTitle ? { seoTitle: page.seoTitle } : {}),
      ...(page.seoDescription ? { seoDescription: page.seoDescription } : {}),
      ...(page.publishedAt ? { publishedAt: page.publishedAt } : {}),
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
    };
  }
}
