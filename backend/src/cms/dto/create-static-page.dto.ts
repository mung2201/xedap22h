import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { PageStatus } from '../../common/enums/cms.enum';

const trimValue = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateStaticPageDto {
  @ApiProperty({ example: 'Warranty policy' })
  @Transform(trimValue)
  @IsString()
  @Length(2, 180)
  title!: string;

  @ApiPropertyOptional({ example: 'warranty-policy', description: 'Generated from title when omitted' })
  @Transform(trimValue)
  @IsOptional()
  @IsString()
  @MaxLength(180)
  slug?: string;

  @ApiPropertyOptional({ example: 'Our warranty terms for bicycles and accessories.' })
  @Transform(trimValue)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  excerpt?: string;

  @ApiProperty({ example: 'Write the page body here. Line breaks are preserved on the public page.' })
  @Transform(trimValue)
  @IsString()
  @Length(1, 50_000)
  content!: string;

  @ApiPropertyOptional({ enum: PageStatus, default: PageStatus.DRAFT })
  @IsOptional()
  @IsEnum(PageStatus)
  status?: PageStatus;

  @ApiPropertyOptional({ example: 'XeDap22h warranty policy' })
  @Transform(trimValue)
  @IsOptional()
  @IsString()
  @MaxLength(180)
  seoTitle?: string;

  @ApiPropertyOptional({ example: 'Read our bicycle and accessory warranty policy.' })
  @Transform(trimValue)
  @IsOptional()
  @IsString()
  @MaxLength(320)
  seoDescription?: string;
}
