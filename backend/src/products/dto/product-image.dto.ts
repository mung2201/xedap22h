import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const trimOptional = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() || undefined : value;

const toOptionalNumber = ({ value }: { value: unknown }): unknown =>
  value === undefined || value === null || value === '' ? undefined : Number(value);

export class ProductImageDto {
  @ApiProperty({ example: 'https://images.example.com/bike.jpg' })
  @Transform(trimOptional)
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  url!: string;

  @ApiPropertyOptional({ example: 'Mountain bike side profile' })
  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MaxLength(180)
  alt?: string;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Transform(toOptionalNumber)
  @IsInt()
  @Min(0)
  @Max(999)
  sortOrder?: number;
}
