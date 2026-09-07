import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  Length,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

const trimValue = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const normalizeSku = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class ProductVariantDto {
  @ApiProperty({ example: 'Black' })
  @Transform(trimValue)
  @IsString()
  @Length(1, 80)
  color!: string;

  @ApiPropertyOptional({ example: '#111111' })
  @Transform(trimValue)
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  colorHex?: string;

  @ApiProperty({ example: 'M' })
  @Transform(trimValue)
  @IsString()
  @Length(1, 80)
  size!: string;

  @ApiProperty({ example: 'TREK-MARLIN-8-BLK-M' })
  @Transform(normalizeSku)
  @IsString()
  @Length(2, 80)
  sku!: string;

  @ApiProperty({ example: 12, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock!: number;

  @ApiPropertyOptional({ example: 300000, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  priceAdjustment?: number;

  @ApiPropertyOptional({ example: 'https://images.example.com/bike-black.jpg' })
  @Transform(trimValue)
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  imageUrl?: string;
}
