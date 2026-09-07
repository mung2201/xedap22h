import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { toOptionalBoolean } from '../../common/transformers/boolean.transformer';
import { VoucherDiscountType } from '../../common/enums/commerce.enum';

const trimValue = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const upperCaseCode = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class CreateVoucherDto {
  @ApiProperty({ example: 'BIKE10' })
  @Transform(upperCaseCode)
  @IsString()
  @Length(3, 64)
  code!: string;

  @ApiProperty({ example: 'Giảm 10% đơn xe đạp' })
  @Transform(trimValue)
  @IsString()
  @Length(3, 180)
  name!: string;

  @ApiPropertyOptional()
  @Transform(trimValue)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ enum: VoucherDiscountType })
  @IsEnum(VoucherDiscountType)
  discountType!: VoucherDiscountType;

  @ApiProperty({ example: 10, minimum: 1, description: 'Percent or VND amount' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000_000)
  discountValue!: number;

  @ApiPropertyOptional({ example: 300000, description: 'Cap for percentage discounts' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxDiscount?: number;

  @ApiPropertyOptional({ example: 2000000, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minOrderValue?: number;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  startDate!: Date;

  @ApiProperty({ example: '2026-12-31T23:59:59.999Z' })
  @Type(() => Date)
  @IsDate()
  endDate!: Date;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  active?: boolean;
}
