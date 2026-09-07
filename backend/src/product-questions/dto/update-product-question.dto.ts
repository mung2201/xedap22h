import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ProductQuestionStatus } from '../../common/enums/product-question.enum';

const trimOptional = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateProductQuestionDto {
  @ApiProperty({ enum: ProductQuestionStatus })
  @IsEnum(ProductQuestionStatus)
  status!: ProductQuestionStatus;

  @ApiPropertyOptional({
    description: 'Required when status is ANSWERED',
    minLength: 2,
    maxLength: 3000,
  })
  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(3000)
  answer?: string;
}
