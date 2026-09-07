import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { toOptionalBoolean } from '../../common/transformers/boolean.transformer';

const trimValue = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const trimKeywords = ({ value }: { value: unknown }): unknown =>
  Array.isArray(value)
    ? value.map((keyword) =>
        typeof keyword === 'string' ? keyword.trim() : keyword,
      )
    : value;

export class CreateFaqDto {
  @ApiProperty({ example: 'Shop bảo hành bao lâu?' })
  @Transform(trimValue)
  @IsString()
  @Length(2, 240)
  question!: string;

  @ApiProperty({
    example:
      'Thời hạn bảo hành phụ thuộc từng thương hiệu và được hiển thị ở thông số sản phẩm. Đội ngũ cửa hàng sẽ hỗ trợ kiểm tra chi tiết trước khi mua.',
  })
  @Transform(trimValue)
  @IsString()
  @Length(1, 5_000)
  answer!: string;

  @ApiProperty({
    type: [String],
    example: ['bảo hành', 'warranty', 'bảo hành bao lâu'],
  })
  @Transform(trimKeywords)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(140, { each: true })
  keywords!: string[];

  @ApiPropertyOptional({
    minimum: 0,
    maximum: 10_000,
    default: 0,
    description: 'Higher values win when matching keywords have the same score.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  priority?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  active?: boolean;
}
