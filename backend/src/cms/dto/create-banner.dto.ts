import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { toOptionalBoolean } from '../../common/transformers/boolean.transformer';
import {
  BannerPosition,
  BannerType,
} from '../../common/enums/cms.enum';

const trimValue = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateBannerDto {
  @ApiProperty({ example: 'Conquer every trail' })
  @Transform(trimValue)
  @IsString()
  @Length(2, 160)
  title!: string;

  @ApiPropertyOptional({ example: 'Selected mountain bikes are on sale this week.' })
  @Transform(trimValue)
  @IsOptional()
  @IsString()
  @MaxLength(360)
  subtitle?: string;

  @ApiProperty({ example: 'https://images.example.com/home-slider.jpg' })
  @Transform(trimValue)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  imageUrl!: string;

  @ApiPropertyOptional({ example: 'https://images.example.com/home-slider-mobile.jpg' })
  @Transform(trimValue)
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  mobileImageUrl?: string;

  @ApiPropertyOptional({ example: '/products?category=mountain-bike' })
  @Transform(trimValue)
  @IsOptional()
  @IsString()
  @Matches(/^(\/|https?:\/\/)/i, {
    message: 'link must be a relative path or an HTTP(S) URL.',
  })
  @MaxLength(2048)
  link?: string;

  @ApiPropertyOptional({ example: 'Shop now' })
  @Transform(trimValue)
  @IsOptional()
  @IsString()
  @MaxLength(48)
  buttonLabel?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  openInNewTab?: boolean;

  @ApiPropertyOptional({ enum: BannerType, default: BannerType.SLIDER })
  @IsOptional()
  @IsEnum(BannerType)
  type?: BannerType;

  @ApiPropertyOptional({ enum: BannerPosition, default: BannerPosition.HOME_HERO })
  @IsOptional()
  @IsEnum(BannerPosition)
  position?: BannerPosition;

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

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.999Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;
}
