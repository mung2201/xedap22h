import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
} from 'class-validator';

const trimOptional = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() || undefined : value;

const trimImageUrls = ({ value }: { value: unknown }): unknown =>
  Array.isArray(value)
    ? value.map((item) => (typeof item === 'string' ? item.trim() : item))
    : value;

export class CreateReviewDto {
  @ApiProperty({ description: 'Product MongoDB ObjectId from the delivered order' })
  @IsMongoId()
  productId!: string;

  @ApiProperty({ description: 'Owned DELIVERED order MongoDB ObjectId' })
  @IsMongoId()
  orderId!: string;

  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ example: 'Xe đi êm, giao hàng đúng mô tả.' })
  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  @Length(2, 2000)
  comment?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['https://cdn.example.com/review-image.jpg'],
  })
  @IsOptional()
  @Transform(trimImageUrls)
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @IsUrl({ require_protocol: true }, { each: true })
  images?: string[];
}
