import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ProductQuestionStatus } from '../../common/enums/product-question.enum';

const trimOptional = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() || undefined : value;

export class AdminProductQuestionQueryDto {
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

  @ApiPropertyOptional({ enum: ProductQuestionStatus })
  @IsOptional()
  @IsEnum(ProductQuestionStatus)
  status?: ProductQuestionStatus;

  @ApiPropertyOptional({ description: 'Filter questions for a product id' })
  @IsOptional()
  @IsMongoId()
  productId?: string;

  @ApiPropertyOptional({ description: 'Question, product, or customer keyword' })
  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MaxLength(160)
  keyword?: string;
}
