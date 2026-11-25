import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BrandsService } from '../brands/brands.service';
import { CategoriesService } from '../categories/categories.service';
import {
  BikeType,
  ProductStatus,
  ProductType,
} from '../common/enums/catalog.enum';
import {
  RecommendationBudget,
  RecommendationPurpose,
  RecommendationStep,
} from '../common/enums/recommendation.enum';
import { Product, ProductDocument, ProductVariant } from '../products/schemas/product.schema';
import { SizeGuide, SizeGuideDocument } from '../size-guide/schemas/size-guide.schema';
import { RecommendationMessageDto } from './dto/recommendation-message.dto';
import {
  RecommendationSession,
  RecommendationSessionDocument,
} from './schemas/recommendation-session.schema';

const SESSION_DURATION_MS = 60 * 60 * 1_000;
const MIN_PREFERRED_RESULTS = 3;
const MAX_RECOMMENDATIONS = 5;

const purposeOptions: RecommendationOption[] = [
  { value: RecommendationPurpose.COMMUTE, label: 'Đi làm / đi lại' },
  { value: RecommendationPurpose.LEISURE, label: 'Đi dạo' },
  { value: RecommendationPurpose.MOUNTAIN, label: 'Leo núi / địa hình' },
  { value: RecommendationPurpose.SPEED, label: 'Đua / tốc độ' },
  { value: RecommendationPurpose.FITNESS, label: 'Tập thể dục' },
];

const budgetOptions: RecommendationOption[] = [
  { value: RecommendationBudget.UNDER_5M, label: 'Dưới 5 triệu' },
  { value: RecommendationBudget.FROM_5M_TO_10M, label: '5–10 triệu' },
  { value: RecommendationBudget.FROM_10M_TO_20M, label: '10–20 triệu' },
  { value: RecommendationBudget.ABOVE_20M, label: 'Trên 20 triệu' },
];

const purposeBikeTypes: Record<RecommendationPurpose, BikeType[]> = {
  [RecommendationPurpose.COMMUTE]: [
    BikeType.CITY,
    BikeType.HYBRID,
    BikeType.FOLDING,
    BikeType.ELECTRIC,
  ],
  [RecommendationPurpose.LEISURE]: [
    BikeType.CITY,
    BikeType.HYBRID,
    BikeType.FOLDING,
  ],
  [RecommendationPurpose.MOUNTAIN]: [BikeType.MOUNTAIN],
  [RecommendationPurpose.SPEED]: [BikeType.ROAD],
  [RecommendationPurpose.FITNESS]: [
    BikeType.HYBRID,
    BikeType.CITY,
    BikeType.ROAD,
  ],
};

interface BudgetRange {
  min?: number;
  max?: number;
}

const budgetRanges: Record<RecommendationBudget, BudgetRange> = {
  [RecommendationBudget.UNDER_5M]: { max: 5_000_000 },
  [RecommendationBudget.FROM_5M_TO_10M]: {
    min: 5_000_000,
    max: 10_000_000,
  },
  [RecommendationBudget.FROM_10M_TO_20M]: {
    min: 10_000_000,
    max: 20_000_000,
  },
  [RecommendationBudget.ABOVE_20M]: { min: 20_000_000 },
};

export interface RecommendationOption {
  value: string;
  label: string;
}

export interface RecommendationInput {
  type: 'NUMBER';
  min: number;
  max: number;
  suffix: string;
  placeholder: string;
}

export interface RecommendedVariant {
  id: string;
  color: string;
  size: string;
  stock: number;
  price: number;
}

export interface ProductRecommendation {
  productId: string;
  name: string;
  image: string;
  price: number;
  salePrice: number;
  reason: string;
  productUrl: string;
  bikeType?: BikeType;
  averageRating: number;
  availableStock: number;
  matchedVariant?: RecommendedVariant;
}

export interface RecommendationFlowResponse {
  sessionId: string;
  type: 'QUESTION' | 'RESULT';
  step: RecommendationStep;
  message: string;
  options?: RecommendationOption[];
  input?: RecommendationInput;
  recommendations?: ProductRecommendation[];
}

interface ScoredProduct {
  product: ProductDocument;
  variant: ProductVariant;
  sizeGuide?: SizeGuideDocument;
  isSizeCompatible: boolean;
  isWithinBudget: boolean;
  purposeScore: number;
  budgetScore: number;
  sizeScore: number;
  ratingScore: number;
  stockScore: number;
  totalScore: number;
  availableStock: number;
  variantPrice: number;
}

@Injectable()
export class RecommendationsService {
  constructor(
    @InjectModel(RecommendationSession.name)
    private readonly sessionModel: Model<RecommendationSession>,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    @InjectModel(SizeGuide.name)
    private readonly sizeGuideModel: Model<SizeGuide>,
    private readonly categoriesService: CategoriesService,
    private readonly brandsService: BrandsService,
  ) {}

  async start(): Promise<RecommendationFlowResponse> {
    const session = await this.sessionModel.create({
      step: RecommendationStep.PURPOSE,
      expiresAt: this.createExpiryDate(),
    });

    return this.toPurposeQuestion(session);
  }

  async continue(
    dto: RecommendationMessageDto,
  ): Promise<RecommendationFlowResponse> {
    const session = await this.findActiveSession(dto.sessionId);

    switch (session.step) {
      case RecommendationStep.PURPOSE:
        return this.handlePurpose(session, dto.answer);
      case RecommendationStep.BUDGET:
        return this.handleBudget(session, dto.answer);
      case RecommendationStep.HEIGHT:
        return this.handleHeight(session, dto.answer);
      case RecommendationStep.RESULT:
        return this.buildResult(session);
      default:
        throw new BadRequestException('Recommendation session is in an invalid state.');
    }
  }

  private async handlePurpose(
    session: RecommendationSessionDocument,
    answer: string,
  ): Promise<RecommendationFlowResponse> {
    const purpose = this.parsePurpose(answer);
    if (!purpose) {
      throw new BadRequestException('Invalid recommendation purpose.');
    }

    session.purpose = purpose;
    session.step = RecommendationStep.BUDGET;
    session.expiresAt = this.createExpiryDate();
    await session.save();

    return this.toBudgetQuestion(session);
  }

  private async handleBudget(
    session: RecommendationSessionDocument,
    answer: string,
  ): Promise<RecommendationFlowResponse> {
    const budget = this.parseBudget(answer);
    if (!budget) {
      throw new BadRequestException('Invalid recommendation budget.');
    }

    session.budget = budget;
    session.step = RecommendationStep.HEIGHT;
    session.expiresAt = this.createExpiryDate();
    await session.save();

    return this.toHeightQuestion(session);
  }

  private async handleHeight(
    session: RecommendationSessionDocument,
    answer: string,
  ): Promise<RecommendationFlowResponse> {
    const heightCm = Number(answer);
    if (!Number.isInteger(heightCm) || heightCm < 100 || heightCm > 250) {
      throw new BadRequestException('Height must be an integer between 100 and 250 cm.');
    }

    session.heightCm = heightCm;
    session.step = RecommendationStep.RESULT;
    session.expiresAt = this.createExpiryDate();
    await session.save();

    return this.buildResult(session);
  }

  private async buildResult(
    session: RecommendationSessionDocument,
  ): Promise<RecommendationFlowResponse> {
    if (!session.purpose || !session.budget || !session.heightCm) {
      throw new BadRequestException('Recommendation session is incomplete.');
    }

    const recommendations = await this.getRecommendations(
      session.purpose,
      session.budget,
      session.heightCm,
    );

    return {
      sessionId: session._id.toString(),
      type: 'RESULT',
      step: RecommendationStep.RESULT,
      message:
        recommendations.length > 0
          ? 'Đây là các mẫu xe được xếp hạng phù hợp nhất với nhu cầu của bạn.'
          : 'Hiện chưa có mẫu xe còn hàng phù hợp. Bạn có thể thử lại với nhu cầu hoặc ngân sách khác.',
      recommendations,
    };
  }

  private async getRecommendations(
    purpose: RecommendationPurpose,
    budget: RecommendationBudget,
    heightCm: number,
  ): Promise<ProductRecommendation[]> {
    const [publicCategoryIds, activeBrandIds] = await Promise.all([
      this.categoriesService.getPublicActiveIds(),
      this.brandsService.getActiveIds(),
    ]);

    if (!publicCategoryIds.length || !activeBrandIds.length) {
      return [];
    }

    const allProducts = await this.productModel
      .find({
        status: ProductStatus.ACTIVE,
        catalogOnly: { $ne: true },
        productType: ProductType.BICYCLE,
        category: { $in: publicCategoryIds },
        brand: { $in: activeBrandIds },
        variants: { $elemMatch: { stock: { $gt: 0 } } },
      })
      .exec();

    if (allProducts.length === 0) {
      return [];
    }

    const preferredBikeTypes = purposeBikeTypes[purpose];
    const purposeMatches = allProducts.filter((product) =>
      product.bikeType ? preferredBikeTypes.includes(product.bikeType) : false,
    );
    const candidates =
      purposeMatches.length >= MIN_PREFERRED_RESULTS ? purposeMatches : allProducts;
    const sizeGuideByBikeType = await this.findSizeGuidesForHeight(
      candidates,
      heightCm,
    );

    return candidates
      .map((product) =>
        this.scoreProduct(
          product,
          purpose,
          budget,
          heightCm,
          sizeGuideByBikeType.get(product.bikeType ?? BikeType.OTHER),
        ),
      )
      .sort(
        (left, right) =>
          right.totalScore - left.totalScore ||
          right.purposeScore - left.purposeScore ||
          right.budgetScore - left.budgetScore ||
          right.sizeScore - left.sizeScore ||
          right.ratingScore - left.ratingScore ||
          right.stockScore - left.stockScore ||
          left.variantPrice - right.variantPrice ||
          left.product.name.localeCompare(right.product.name, 'vi'),
      )
      .slice(0, MAX_RECOMMENDATIONS)
      .map((scored) => this.toRecommendation(scored, purpose, budget, heightCm));
  }

  private async findSizeGuidesForHeight(
    products: ProductDocument[],
    heightCm: number,
  ): Promise<Map<BikeType, SizeGuideDocument>> {
    const bikeTypes = [
      ...new Set(
        products
          .map((product) => product.bikeType)
          .filter((bikeType): bikeType is BikeType => Boolean(bikeType)),
      ),
    ];

    if (bikeTypes.length === 0) {
      return new Map();
    }

    const sizeGuides = await this.sizeGuideModel
      .find({
        bikeType: { $in: bikeTypes },
        active: true,
        minHeightCm: { $lte: heightCm },
        maxHeightCm: { $gte: heightCm },
      })
      .sort({ sortOrder: 1, minHeightCm: 1 })
      .exec();

    const result = new Map<BikeType, SizeGuideDocument>();
    for (const sizeGuide of sizeGuides) {
      if (!result.has(sizeGuide.bikeType)) {
        result.set(sizeGuide.bikeType, sizeGuide);
      }
    }
    return result;
  }

  private scoreProduct(
    product: ProductDocument,
    purpose: RecommendationPurpose,
    budget: RecommendationBudget,
    heightCm: number,
    sizeGuide?: SizeGuideDocument,
  ): ScoredProduct {
    const availableVariants = product.variants.filter((variant) => variant.stock > 0);
    const compatibleVariant = sizeGuide
      ? availableVariants.find((variant) => this.isSizeCompatible(variant.size, sizeGuide))
      : undefined;
    const variant = compatibleVariant ?? this.selectLowestPricedVariant(product, availableVariants);
    const variantPrice = product.salePrice + (variant.priceAdjustment ?? 0);
    const availableStock = availableVariants.reduce(
      (total, item) => total + item.stock,
      0,
    );
    const purposeScore = purposeBikeTypes[purpose].includes(
      product.bikeType ?? BikeType.OTHER,
    )
      ? 45
      : 0;
    const isWithinBudget = this.isWithinBudget(variantPrice, budget);
    const budgetScore = this.getBudgetScore(variantPrice, budget);
    const isSizeCompatible = Boolean(compatibleVariant);
    const sizeScore = isSizeCompatible ? 25 : sizeGuide ? 2 : 6;
    const ratingScore = Math.min(product.averageRating ?? 0, 5) * 1.2;
    const stockScore = Math.min(availableStock, 12) / 4;

    return {
      product,
      variant,
      ...(sizeGuide ? { sizeGuide } : {}),
      isSizeCompatible,
      isWithinBudget,
      purposeScore,
      budgetScore,
      sizeScore,
      ratingScore,
      stockScore,
      totalScore:
        purposeScore + budgetScore + sizeScore + ratingScore + stockScore,
      availableStock,
      variantPrice,
    };
  }

  private toRecommendation(
    scored: ScoredProduct,
    purpose: RecommendationPurpose,
    budget: RecommendationBudget,
    heightCm: number,
  ): ProductRecommendation {
    const reasonParts = [
      scored.purposeScore > 0
        ? `Phù hợp nhu cầu ${this.getPurposeLabel(purpose).toLocaleLowerCase('vi-VN')}`
        : `Là lựa chọn xe còn hàng gần nhất với nhu cầu ${this.getPurposeLabel(purpose).toLocaleLowerCase('vi-VN')}`,
      scored.isWithinBudget
        ? `nằm trong ngân sách ${this.getBudgetLabel(budget).toLocaleLowerCase('vi-VN')}`
        : `là lựa chọn gần nhất với ngân sách ${this.getBudgetLabel(budget).toLocaleLowerCase('vi-VN')}`,
    ];

    if (scored.isSizeCompatible && scored.sizeGuide) {
      reasonParts.push(
        `có size ${scored.variant.size} phù hợp chiều cao ${heightCm} cm (${scored.sizeGuide.frameSizeLabel})`,
      );
    } else if (scored.sizeGuide) {
      reasonParts.push(
        `còn hàng; nên kiểm tra thêm size ${scored.sizeGuide.recommendedSize} cho chiều cao ${heightCm} cm`,
      );
    } else {
      reasonParts.push('đang còn hàng');
    }

    return {
      productId: scored.product._id.toString(),
      name: scored.product.name,
      image: scored.product.thumbnail,
      price: scored.product.originalPrice,
      salePrice: scored.variantPrice,
      reason: `${reasonParts.join(', ')}.`,
      productUrl: `/products/${scored.product.slug}`,
      ...(scored.product.bikeType ? { bikeType: scored.product.bikeType } : {}),
      averageRating: scored.product.averageRating ?? 0,
      availableStock: scored.availableStock,
      ...(scored.isSizeCompatible
        ? {
            matchedVariant: {
              id: scored.variant._id.toString(),
              color: scored.variant.color,
              size: scored.variant.size,
              stock: scored.variant.stock,
              price: scored.variantPrice,
            },
          }
        : {}),
    };
  }

  private selectLowestPricedVariant(
    product: ProductDocument,
    variants: ProductVariant[],
  ): ProductVariant {
    return [...variants].sort(
      (left, right) =>
        product.salePrice + (left.priceAdjustment ?? 0) -
          (product.salePrice + (right.priceAdjustment ?? 0)) ||
        right.stock - left.stock ||
        left.sku.localeCompare(right.sku),
    )[0];
  }

  private isSizeCompatible(
    variantSize: string,
    sizeGuide: SizeGuideDocument,
  ): boolean {
    const normalizedVariantSize = variantSize.trim().toLocaleUpperCase('vi-VN');
    const recommendedSizes = sizeGuide.recommendedSize
      .split(/[/,]/)
      .map((size) => size.trim().toLocaleUpperCase('vi-VN'));

    if (recommendedSizes.includes(normalizedVariantSize)) {
      return true;
    }

    const variantNumber = this.extractFirstNumber(variantSize);
    const frameNumbers = this.extractNumbers(sizeGuide.frameSizeLabel);
    return (
      variantNumber !== undefined &&
      frameNumbers.length >= 2 &&
      variantNumber >= Math.min(...frameNumbers) &&
      variantNumber <= Math.max(...frameNumbers)
    );
  }

  private isWithinBudget(
    price: number,
    budget: RecommendationBudget,
  ): boolean {
    const range = budgetRanges[budget];
    return (
      (range.min === undefined || price >= range.min) &&
      (range.max === undefined || price <= range.max)
    );
  }

  private getBudgetScore(price: number, budget: RecommendationBudget): number {
    if (this.isWithinBudget(price, budget)) {
      return 30;
    }

    const range = budgetRanges[budget];
    const boundary = range.max ?? range.min ?? price;
    const distanceRatio = Math.abs(price - boundary) / Math.max(boundary, 1);
    return Math.max(0, 24 - Math.round(distanceRatio * 24));
  }

  private toPurposeQuestion(
    session: RecommendationSessionDocument,
  ): RecommendationFlowResponse {
    return {
      sessionId: session._id.toString(),
      type: 'QUESTION',
      step: RecommendationStep.PURPOSE,
      message: 'Bạn mua xe để làm gì?',
      options: purposeOptions,
    };
  }

  private toBudgetQuestion(
    session: RecommendationSessionDocument,
  ): RecommendationFlowResponse {
    return {
      sessionId: session._id.toString(),
      type: 'QUESTION',
      step: RecommendationStep.BUDGET,
      message: 'Khoảng ngân sách của bạn?',
      options: budgetOptions,
    };
  }

  private toHeightQuestion(
    session: RecommendationSessionDocument,
  ): RecommendationFlowResponse {
    return {
      sessionId: session._id.toString(),
      type: 'QUESTION',
      step: RecommendationStep.HEIGHT,
      message: 'Chiều cao của bạn là bao nhiêu?',
      input: {
        type: 'NUMBER',
        min: 100,
        max: 250,
        suffix: 'cm',
        placeholder: 'Ví dụ: 172',
      },
    };
  }

  private parsePurpose(value: string): RecommendationPurpose | undefined {
    return Object.values(RecommendationPurpose).find(
      (purpose) => purpose === value.trim().toUpperCase(),
    );
  }

  private parseBudget(value: string): RecommendationBudget | undefined {
    return Object.values(RecommendationBudget).find(
      (budget) => budget === value.trim().toUpperCase(),
    );
  }

  private getPurposeLabel(purpose: RecommendationPurpose): string {
    return purposeOptions.find((option) => option.value === purpose)?.label ?? purpose;
  }

  private getBudgetLabel(budget: RecommendationBudget): string {
    return budgetOptions.find((option) => option.value === budget)?.label ?? budget;
  }

  private extractNumbers(value: string): number[] {
    return (value.match(/\d+(?:[.,]\d+)?/g) ?? [])
      .map((item) => Number(item.replace(',', '.')))
      .filter((item) => Number.isFinite(item));
  }

  private extractFirstNumber(value: string): number | undefined {
    return this.extractNumbers(value)[0];
  }

  private async findActiveSession(
    sessionId: string,
  ): Promise<RecommendationSessionDocument> {
    const session = await this.sessionModel
      .findOne({ _id: sessionId, expiresAt: { $gt: new Date() } })
      .exec();

    if (!session) {
      throw new NotFoundException('Recommendation session not found or expired.');
    }

    return session;
  }

  private createExpiryDate(): Date {
    return new Date(Date.now() + SESSION_DURATION_MS);
  }
}
