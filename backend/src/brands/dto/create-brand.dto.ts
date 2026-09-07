import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import { toOptionalBoolean } from '../../common/transformers/boolean.transformer';

const trimValue = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const optionalTrimValue = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() || undefined : value;

export class CreateBrandDto {
  @ApiProperty({ example: 'Trek' })
  @Transform(trimValue)
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiPropertyOptional({ example: 'trek' })
  @Transform(optionalTrimValue)
  @IsOptional()
  @IsString()
  @MaxLength(160)
  slug?: string;

  @ApiPropertyOptional({ example: 'A global bicycle manufacturer.' })
  @Transform(optionalTrimValue)
  @IsOptional()
  @IsString()
  @MaxLength(1500)
  description?: string;

  @ApiPropertyOptional({ example: 'https://images.example.com/trek-logo.png' })
  @Transform(optionalTrimValue)
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'https://www.trekbikes.com' })
  @Transform(optionalTrimValue)
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  website?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 1, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
