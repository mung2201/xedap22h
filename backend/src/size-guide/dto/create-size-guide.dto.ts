import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
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
import { BikeType } from '../../common/enums/catalog.enum';

const trimValue = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateSizeGuideDto {
  @ApiProperty({ enum: BikeType, example: BikeType.MOUNTAIN })
  @IsEnum(BikeType)
  bikeType!: BikeType;

  @ApiProperty({ example: 165, minimum: 100, maximum: 250 })
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(250)
  minHeightCm!: number;

  @ApiProperty({ example: 172, minimum: 100, maximum: 250 })
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(250)
  maxHeightCm!: number;

  @ApiProperty({ example: 'S' })
  @Transform(trimValue)
  @IsString()
  @Length(1, 40)
  recommendedSize!: string;

  @ApiProperty({ example: '15–16 inch' })
  @Transform(trimValue)
  @IsString()
  @Length(1, 80)
  frameSizeLabel!: string;

  @ApiPropertyOptional({ example: 'Suitable for riders looking for a nimble trail bike.' })
  @Transform(trimValue)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  active?: boolean;
}
