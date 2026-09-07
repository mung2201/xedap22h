import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { toOptionalBoolean } from '../../common/transformers/boolean.transformer';

const trimValue = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateAddressDto {
  @ApiProperty({ example: 'Nguyen Van An' })
  @Transform(trimValue)
  @IsString()
  @Length(2, 120)
  recipientName!: string;

  @ApiProperty({ example: '0901234567' })
  @Transform(trimValue)
  @IsPhoneNumber('VN')
  phone!: string;

  @ApiProperty({ example: 'Ho Chi Minh City' })
  @Transform(trimValue)
  @IsString()
  @Length(2, 120)
  province!: string;

  @ApiProperty({ example: 'District 1' })
  @Transform(trimValue)
  @IsString()
  @Length(2, 120)
  district!: string;

  @ApiProperty({ example: 'Ben Nghe Ward' })
  @Transform(trimValue)
  @IsString()
  @Length(2, 120)
  ward!: string;

  @ApiProperty({ example: '12 Nguyen Hue Street, Apartment 8A' })
  @Transform(trimValue)
  @IsString()
  @Length(5, 300)
  addressLine!: string;

  @ApiPropertyOptional({ example: 'Call before delivery.' })
  @IsOptional()
  @Transform(trimValue)
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  isDefault?: boolean;
}
