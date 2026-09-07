import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { VoucherDiscountType } from '../common/enums/commerce.enum';
import {
  createPaginatedResult,
  PaginatedResult,
} from '../common/interfaces/pagination.interface';
import { assertNoUnexpectedNull } from '../common/utils/input-validation.util';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { VoucherQueryDto } from './dto/voucher-query.dto';
import { Voucher, VoucherDocument } from './schemas/voucher.schema';

export interface VoucherResponse {
  id: string;
  code: string;
  name: string;
  description?: string;
  discountType: VoucherDiscountType;
  discountValue: number;
  maxDiscount?: number;
  minOrderValue: number;
  startDate: Date;
  endDate: Date;
  usageLimit?: number;
  usedCount: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolvedVoucher {
  voucherId: string;
  code: string;
  name: string;
  discountType: VoucherDiscountType;
  discountValue: number;
  discountAmount: number;
}

@Injectable()
export class VouchersService {
  constructor(
    @InjectModel(Voucher.name) private readonly voucherModel: Model<Voucher>,
  ) {}

  async findAdmin(
    query: VoucherQueryDto,
  ): Promise<PaginatedResult<VoucherResponse[]>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: Record<string, unknown> = {};

    if (query.keyword) {
      const keyword = new RegExp(this.escapeRegExp(query.keyword), 'i');
      filter.$or = [{ code: keyword }, { name: keyword }];
    }

    if (query.active !== undefined) {
      filter.active = query.active;
    }

    const [vouchers, total] = await Promise.all([
      this.voucherModel
        .find(filter)
        .sort({ active: -1, endDate: 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.voucherModel.countDocuments(filter).exec(),
    ]);

    return createPaginatedResult(
      vouchers.map((voucher) => this.toResponse(voucher)),
      page,
      limit,
      total,
    );
  }

  async create(dto: CreateVoucherDto): Promise<VoucherResponse> {
    const input = this.normalizeInput(dto);
    this.assertBusinessRules(input);

    const exists = await this.voucherModel.exists({ code: input.code }).exec();
    if (exists) {
      throw new ConflictException('Voucher code is already in use.');
    }

    const voucher = await this.voucherModel.create(input);
    return this.toResponse(voucher);
  }

  async update(
    voucherId: string,
    dto: UpdateVoucherDto,
  ): Promise<VoucherResponse> {
    assertNoUnexpectedNull(dto, ['description', 'maxDiscount', 'usageLimit']);
    const voucher = await this.findDocumentById(voucherId);
    // PATCH distinguishes an omitted optional field (leave unchanged) from a
    // deliberate clear (null from the admin form).
    const patch = dto as UpdateVoucherDto & {
      description?: string | null;
      maxDiscount?: number | null;
      usageLimit?: number | null;
    };
    const input = this.normalizeInput({
      code: dto.code ?? voucher.code,
      name: dto.name ?? voucher.name,
      description:
        patch.description === null
          ? undefined
          : patch.description ?? voucher.description,
      discountType: dto.discountType ?? voucher.discountType,
      discountValue: dto.discountValue ?? voucher.discountValue,
      maxDiscount:
        patch.maxDiscount === null
          ? undefined
          : patch.maxDiscount ?? voucher.maxDiscount,
      minOrderValue: dto.minOrderValue ?? voucher.minOrderValue,
      startDate: dto.startDate ?? voucher.startDate,
      endDate: dto.endDate ?? voucher.endDate,
      usageLimit:
        patch.usageLimit === null
          ? undefined
          : patch.usageLimit ?? voucher.usageLimit,
      active: dto.active ?? voucher.active,
    });
    this.assertBusinessRules(input);

    if (
      input.usageLimit !== undefined &&
      input.usageLimit < voucher.usedCount
    ) {
      throw new BadRequestException(
        'usageLimit cannot be lower than the voucher usedCount.',
      );
    }

    if (input.code !== voucher.code) {
      const exists = await this.voucherModel
        .exists({ code: input.code, _id: { $ne: voucherId } })
        .exec();
      if (exists) {
        throw new ConflictException('Voucher code is already in use.');
      }
    }

    Object.assign(voucher, input);
    if (patch.description === null) {
      voucher.description = undefined;
    }
    if (
      patch.maxDiscount === null ||
      input.discountType === VoucherDiscountType.FIXED
    ) {
      voucher.maxDiscount = undefined;
    }
    if (patch.usageLimit === null) {
      voucher.usageLimit = undefined;
    }
    await voucher.save();
    return this.toResponse(voucher);
  }

  async remove(voucherId: string): Promise<{ id: string }> {
    const voucher = await this.findDocumentById(voucherId);

    if (voucher.usedCount > 0) {
      throw new BadRequestException('A used voucher cannot be deleted. Disable it instead.');
    }

    await voucher.deleteOne();
    return { id: voucherId };
  }

  async resolveForSubtotal(
    code: string | undefined,
    subtotal: number,
    session?: ClientSession,
  ): Promise<ResolvedVoucher | undefined> {
    if (!code?.trim()) {
      return undefined;
    }

    const now = new Date();
    const query = this.voucherModel.findOne({
      code: this.normalizeCode(code),
      active: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    });

    if (session) {
      query.session(session);
    }

    const voucher = await query.exec();

    if (!voucher) {
      throw new BadRequestException('Voucher is invalid, inactive, or expired.');
    }

    if (
      voucher.usageLimit !== undefined &&
      voucher.usedCount >= voucher.usageLimit
    ) {
      throw new BadRequestException('Voucher usage limit has been reached.');
    }

    if (subtotal < voucher.minOrderValue) {
      throw new BadRequestException(
        `Voucher requires a minimum order value of ${voucher.minOrderValue}.`,
      );
    }

    return {
      voucherId: voucher._id.toString(),
      code: voucher.code,
      name: voucher.name,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      discountAmount: this.calculateDiscount(voucher, subtotal),
    };
  }

  async consume(voucherId: string, session: ClientSession): Promise<void> {
    const now = new Date();
    const result = await this.voucherModel
      .updateOne(
        {
          _id: voucherId,
          active: true,
          startDate: { $lte: now },
          endDate: { $gte: now },
          $or: [
            { usageLimit: { $exists: false } },
            { usageLimit: null },
            { $expr: { $lt: ['$usedCount', '$usageLimit'] } },
          ],
        },
        { $inc: { usedCount: 1 } },
        { session },
      )
      .exec();

    if (result.modifiedCount !== 1) {
      throw new ConflictException('Voucher is no longer available.');
    }
  }

  async release(voucherId: string, session: ClientSession): Promise<void> {
    await this.voucherModel
      .updateOne(
        { _id: voucherId, usedCount: { $gt: 0 } },
        { $inc: { usedCount: -1 } },
        { session },
      )
      .exec();
  }

  async upsertForSeed(dto: CreateVoucherDto): Promise<VoucherResponse> {
    const existing = await this.voucherModel
      .findOne({ code: this.normalizeCode(dto.code) })
      .exec();

    return existing
      ? this.update(existing._id.toString(), dto)
      : this.create(dto);
  }

  private async findDocumentById(voucherId: string): Promise<VoucherDocument> {
    const voucher = await this.voucherModel.findById(voucherId).exec();
    if (!voucher) {
      throw new NotFoundException('Voucher not found.');
    }
    return voucher;
  }

  private normalizeInput(input: CreateVoucherDto): CreateVoucherDto {
    const normalized: CreateVoucherDto = {
      ...input,
      code: this.normalizeCode(input.code),
      name: input.name.trim(),
      minOrderValue: input.minOrderValue ?? 0,
      active: input.active ?? true,
    };

    if (input.description?.trim()) {
      normalized.description = input.description.trim();
    } else {
      normalized.description = undefined;
    }

    if (input.discountType === VoucherDiscountType.FIXED) {
      normalized.maxDiscount = undefined;
    }

    return normalized;
  }

  private assertBusinessRules(input: CreateVoucherDto): void {
    if (input.startDate >= input.endDate) {
      throw new BadRequestException('Voucher endDate must be after startDate.');
    }

    if (
      input.discountType === VoucherDiscountType.PERCENT &&
      input.discountValue > 100
    ) {
      throw new BadRequestException('Percentage voucher discount cannot exceed 100.');
    }

    if (
      input.usageLimit !== undefined &&
      input.usageLimit < 1
    ) {
      throw new BadRequestException('usageLimit must be at least 1.');
    }
  }

  private calculateDiscount(voucher: VoucherDocument, subtotal: number): number {
    if (voucher.discountType === VoucherDiscountType.FIXED) {
      return Math.min(voucher.discountValue, subtotal);
    }

    const rawDiscount = Math.round((subtotal * voucher.discountValue) / 100);
    const cappedDiscount =
      voucher.maxDiscount !== undefined
        ? Math.min(rawDiscount, voucher.maxDiscount)
        : rawDiscount;

    return Math.min(cappedDiscount, subtotal);
  }

  private normalizeCode(value: string): string {
    return value.trim().toUpperCase();
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private toResponse(voucher: VoucherDocument): VoucherResponse {
    return {
      id: voucher._id.toString(),
      code: voucher.code,
      name: voucher.name,
      ...(voucher.description ? { description: voucher.description } : {}),
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      ...(voucher.maxDiscount !== undefined
        ? { maxDiscount: voucher.maxDiscount }
        : {}),
      minOrderValue: voucher.minOrderValue,
      startDate: voucher.startDate,
      endDate: voucher.endDate,
      ...(voucher.usageLimit !== undefined
        ? { usageLimit: voucher.usageLimit }
        : {}),
      usedCount: voucher.usedCount,
      active: voucher.active,
      createdAt: voucher.createdAt,
      updatedAt: voucher.updatedAt,
    };
  }
}
