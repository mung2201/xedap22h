import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { toOptionalBoolean } from '../../common/transformers/boolean.transformer';
import {
  BikeType,
  ProductStatus,
  ProductType,
} from '../../common/enums/catalog.enum';
import { ProductImageDto } from './product-image.dto';
import { ProductSpecificationDto } from './product-specification.dto';
import { ProductVariantDto } from './product-variant.dto';

const trimValue = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const normalizeSku = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

const normalizeOptional = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() || undefined : value;

export class CreateProductDto {
  @ApiProperty({ example: 'Trek Marlin 8 Gen 3' })
  @Transform(trimValue)
  @IsString()
  @Length(2, 220)
  name!: string;

  @ApiPropertyOptional({ example: 'trek-marlin-8-gen-3' })
  @Transform(normalizeOptional)
  @IsOptional()
  @IsString()
  @MaxLength(240)
  slug?: string;

  @ApiProperty({ example: 'TREK-MARLIN-8-G3' })
  @Transform(normalizeSku)
  @IsString()
  @Length(2, 80)
  sku!: string;

  @ApiProperty({ example: 'Xe đạp địa hình trail linh hoạt.' })
  @Transform(trimValue)
  @IsString()
  @Length(10, 600)
  shortDescription!: string;

  @ApiProperty({ example: 'Mô tả chi tiết sản phẩm.' })
  @Transform(trimValue)
  @IsString()
  @Length(20, 30_000)
  description!: string;

  @ApiProperty({ description: 'MongoDB ObjectId of the category' })
  @IsMongoId()
  category!: string;

  @ApiProperty({ description: 'MongoDB ObjectId of the brand' })
  @IsMongoId()
  brand!: string;

  @ApiProperty({ enum: ProductType, example: ProductType.BICYCLE })
  @IsEnum(ProductType)
  productType!: ProductType;

  @ApiProperty({ example: 25000000, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  originalPrice!: number;

  @ApiProperty({ example: 21900000, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  salePrice!: number;

  @ApiProperty({ type: [ProductImageDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  images!: ProductImageDto[];

  @ApiProperty({ example: 'https://images.example.com/thumbnail.jpg' })
  @Transform(normalizeOptional)
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  thumbnail!: string;

  @ApiPropertyOptional({ enum: ProductStatus, default: ProductStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ enum: BikeType, description: 'Required for BICYCLE products' })
  @IsOptional()
  @IsEnum(BikeType)
  bikeType?: BikeType;

  @ApiPropertyOptional({ example: 'Alpha Silver Aluminum' })
  @Transform(normalizeOptional)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  frameMaterial?: string;

  @ApiPropertyOptional({ example: '29 inch' })
  @Transform(normalizeOptional)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  wheelSize?: string;

  @ApiPropertyOptional({ example: '13.5 kg' })
  @Transform(normalizeOptional)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  weight?: string;

  @ApiPropertyOptional({ type: [ProductSpecificationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSpecificationDto)
  specifications?: ProductSpecificationDto[];

  @ApiProperty({ type: [ProductVariantDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants!: ProductVariantDto[];
}
