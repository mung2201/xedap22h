import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsMongoId, Max, Min } from 'class-validator';

export class AddCartItemDto {
  @ApiProperty({ description: 'Product MongoDB ObjectId' })
  @IsMongoId()
  productId!: string;

  @ApiProperty({ description: 'Embedded ProductVariant MongoDB ObjectId' })
  @IsMongoId()
  variantId!: string;

  @ApiProperty({ example: 1, minimum: 1, maximum: 99 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number;
}
