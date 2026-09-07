import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { toOptionalBoolean } from '../../common/transformers/boolean.transformer';
import { BikeType, ProductSort } from '../../common/enums/catalog.enum';

const trimOptional = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() || undefined : value;

export class ProductQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 12, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 12;

  @ApiPropertyOptional({ description: 'Search name, description, or SKU' })
  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  keyword?: string;

  @ApiPropertyOptional({ example: 'mountain-bike', description: 'Category slug' })
  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MaxLength(240)
  category?: string;

  @ApiPropertyOptional({ example: 'trek', description: 'Brand slug' })
  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MaxLength(240)
  brand?: string;

  @ApiPropertyOptional({ example: 'Black' })
  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  color?: string;

  @ApiPropertyOptional({ example: 'M' })
  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  size?: string;

  @ApiPropertyOptional({ enum: BikeType })
  @IsOptional()
  @IsEnum(BikeType)
  bikeType?: BikeType;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Only products with a discount' })
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  onSale?: boolean;

  @ApiPropertyOptional({ description: 'Only products with available variants' })
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  inStock?: boolean;

  @ApiPropertyOptional({ description: 'Only featured products' })
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ enum: ProductSort, default: ProductSort.NEWEST })
  @IsOptional()
  @IsEnum(ProductSort)
  sort: ProductSort = ProductSort.NEWEST;
}
