import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BikeType } from '../common/enums/catalog.enum';
import {
  createPaginatedResult,
  PaginatedResult,
} from '../common/interfaces/pagination.interface';
import { assertNoUnexpectedNull } from '../common/utils/input-validation.util';
import { CreateSizeGuideDto } from './dto/create-size-guide.dto';
import { RecommendSizeDto } from './dto/recommend-size.dto';
import { SizeGuideQueryDto } from './dto/size-guide-query.dto';
import { UpdateSizeGuideDto } from './dto/update-size-guide.dto';
import { SizeGuide, SizeGuideDocument } from './schemas/size-guide.schema';

export interface SizeGuideResponse {
  id: string;
  bikeType: BikeType;
  minHeightCm: number;
  maxHeightCm: number;
  recommendedSize: string;
  frameSizeLabel: string;
  description?: string;
  sortOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SizeRecommendationResponse {
  heightCm: number;
  bikeType: BikeType;
  ruleId: string;
  heightRange: {
    minHeightCm: number;
    maxHeightCm: number;
  };
  recommendedSize: string;
  frameSizeLabel: string;
  description?: string;
}

interface NormalizedSizeGuideInput {
  bikeType: BikeType;
  minHeightCm: number;
  maxHeightCm: number;
  recommendedSize: string;
  frameSizeLabel: string;
  description?: string;
  sortOrder: number;
  active: boolean;
}

@Injectable()
export class SizeGuidesService {
  constructor(
    @InjectModel(SizeGuide.name)
    private readonly sizeGuideModel: Model<SizeGuide>,
  ) {}

  async recommend(dto: RecommendSizeDto): Promise<SizeRecommendationResponse> {
    const rule = await this.sizeGuideModel
      .findOne({
        bikeType: dto.bikeType,
        active: true,
        minHeightCm: { $lte: dto.heightCm },
        maxHeightCm: { $gte: dto.heightCm },
      })
      .sort({ sortOrder: 1, minHeightCm: 1 })
      .exec();

    if (!rule) {
      throw new NotFoundException(
        'No active size guide rule covers this height and bike type.',
      );
    }

    return {
      heightCm: dto.heightCm,
      bikeType: dto.bikeType,
      ruleId: rule._id.toString(),
      heightRange: {
        minHeightCm: rule.minHeightCm,
        maxHeightCm: rule.maxHeightCm,
      },
      recommendedSize: rule.recommendedSize,
      frameSizeLabel: rule.frameSizeLabel,
      ...(rule.description ? { description: rule.description } : {}),
    };
  }

  async findAdmin(
    query: SizeGuideQueryDto,
  ): Promise<PaginatedResult<SizeGuideResponse[]>> {
    const filter: Record<string, unknown> = {
      ...(query.bikeType ? { bikeType: query.bikeType } : {}),
      ...(query.active !== undefined ? { active: query.active } : {}),
    };

    const [rules, total] = await Promise.all([
      this.sizeGuideModel
        .find(filter)
        .sort({ bikeType: 1, minHeightCm: 1, sortOrder: 1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .exec(),
      this.sizeGuideModel.countDocuments(filter).exec(),
    ]);

    return createPaginatedResult(
      rules.map((rule) => this.toResponse(rule)),
      query.page,
      query.limit,
      total,
    );
  }

  async findAdminById(ruleId: string): Promise<SizeGuideResponse> {
    return this.toResponse(await this.findDocumentById(ruleId));
  }

  async create(
    dto: CreateSizeGuideDto,
    actorId?: string,
  ): Promise<SizeGuideResponse> {
    const input = this.normalizeCreateInput(dto);
    this.assertHeightRange(input.minHeightCm, input.maxHeightCm);

    if (input.active) {
      await this.assertNoActiveOverlap(
        input.bikeType,
        input.minHeightCm,
        input.maxHeightCm,
      );
    }

    const actor = actorId ? new Types.ObjectId(actorId) : undefined;
    const rule = await this.sizeGuideModel.create({
      ...input,
      ...(actor ? { createdBy: actor, updatedBy: actor } : {}),
    });

    return this.toResponse(rule);
  }

  async update(
    ruleId: string,
    dto: UpdateSizeGuideDto,
    actorId?: string,
  ): Promise<SizeGuideResponse> {
    assertNoUnexpectedNull(dto, ['description']);
    const rule = await this.findDocumentById(ruleId);
    const patch = dto as UpdateSizeGuideDto & { description?: string | null };
    const nextBikeType = dto.bikeType ?? rule.bikeType;
    const nextMinHeightCm = dto.minHeightCm ?? rule.minHeightCm;
    const nextMaxHeightCm = dto.maxHeightCm ?? rule.maxHeightCm;
    const nextActive = dto.active ?? rule.active;
    this.assertHeightRange(nextMinHeightCm, nextMaxHeightCm);

    if (nextActive) {
      await this.assertNoActiveOverlap(
        nextBikeType,
        nextMinHeightCm,
        nextMaxHeightCm,
        ruleId,
      );
    }

    if (dto.bikeType !== undefined) {
      rule.bikeType = dto.bikeType;
    }
    if (dto.minHeightCm !== undefined) {
      rule.minHeightCm = dto.minHeightCm;
    }
    if (dto.maxHeightCm !== undefined) {
      rule.maxHeightCm = dto.maxHeightCm;
    }
    if (dto.recommendedSize !== undefined) {
      rule.recommendedSize = dto.recommendedSize.trim();
    }
    if (dto.frameSizeLabel !== undefined) {
      rule.frameSizeLabel = dto.frameSizeLabel.trim();
    }
    if (patch.description !== undefined) {
      rule.description = this.toOptionalTrimmed(patch.description ?? undefined);
    }
    if (dto.sortOrder !== undefined) {
      rule.sortOrder = dto.sortOrder;
    }
    if (dto.active !== undefined) {
      rule.active = dto.active;
    }
    if (actorId) {
      rule.updatedBy = new Types.ObjectId(actorId);
    }

    await rule.save();
    return this.toResponse(rule);
  }

  async remove(ruleId: string): Promise<{ id: string }> {
    const rule = await this.findDocumentById(ruleId);
    await rule.deleteOne();
    return { id: ruleId };
  }

  async upsertForSeed(dto: CreateSizeGuideDto): Promise<SizeGuideResponse> {
    const existing = await this.sizeGuideModel
      .findOne({
        bikeType: dto.bikeType,
        minHeightCm: dto.minHeightCm,
        maxHeightCm: dto.maxHeightCm,
      })
      .exec();

    return existing
      ? this.update(existing._id.toString(), dto)
      : this.create(dto);
  }

  private normalizeCreateInput(
    dto: CreateSizeGuideDto,
  ): NormalizedSizeGuideInput {
    return {
      bikeType: dto.bikeType,
      minHeightCm: dto.minHeightCm,
      maxHeightCm: dto.maxHeightCm,
      recommendedSize: dto.recommendedSize.trim(),
      frameSizeLabel: dto.frameSizeLabel.trim(),
      ...(this.toOptionalTrimmed(dto.description)
        ? { description: this.toOptionalTrimmed(dto.description) }
        : {}),
      sortOrder: dto.sortOrder ?? 0,
      active: dto.active ?? true,
    };
  }

  private async findDocumentById(ruleId: string): Promise<SizeGuideDocument> {
    const rule = await this.sizeGuideModel.findById(ruleId).exec();
    if (!rule) {
      throw new NotFoundException('Size guide rule not found.');
    }
    return rule;
  }

  private async assertNoActiveOverlap(
    bikeType: BikeType,
    minHeightCm: number,
    maxHeightCm: number,
    excludedRuleId?: string,
  ): Promise<void> {
    const overlap = await this.sizeGuideModel
      .exists({
        bikeType,
        active: true,
        minHeightCm: { $lte: maxHeightCm },
        maxHeightCm: { $gte: minHeightCm },
        ...(excludedRuleId ? { _id: { $ne: excludedRuleId } } : {}),
      })
      .exec();

    if (overlap) {
      throw new ConflictException(
        'An active size guide rule already overlaps this height range.',
      );
    }
  }

  private assertHeightRange(minHeightCm: number, maxHeightCm: number): void {
    if (minHeightCm > maxHeightCm) {
      throw new BadRequestException(
        'minHeightCm must be less than or equal to maxHeightCm.',
      );
    }
  }

  private toOptionalTrimmed(value?: string): string | undefined {
    const normalized = value?.trim();
    return normalized || undefined;
  }

  private toResponse(rule: SizeGuideDocument): SizeGuideResponse {
    return {
      id: rule._id.toString(),
      bikeType: rule.bikeType,
      minHeightCm: rule.minHeightCm,
      maxHeightCm: rule.maxHeightCm,
      recommendedSize: rule.recommendedSize,
      frameSizeLabel: rule.frameSizeLabel,
      ...(rule.description ? { description: rule.description } : {}),
      sortOrder: rule.sortOrder,
      active: rule.active,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }
}
