import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { toOptionalBoolean } from '../../common/transformers/boolean.transformer';
import { AddressFormat } from '../address-format.enum';

const trimValue = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateAddressDto {
  @ApiProperty({ example: 'Nguyen Van An' })
  @Transform(trimValue)
  @IsString()
  @Length(2, 120)
  recipientName!: string;

  @ApiProperty({ example: '0901234567', description: 'Số di động Việt Nam gồm đúng 10 chữ số.' })
  @IsString()
  @Matches(/^0[35789][0-9]{8}$/, {
    message: 'Số điện thoại phải gồm đúng 10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09.',
  })
  phone!: string;

  @ApiPropertyOptional({ enum: AddressFormat, description: 'CURRENT: tỉnh/thành và phường/xã; LEGACY: địa chỉ trước sắp xếp.' })
  @IsOptional()
  @IsEnum(AddressFormat, { message: 'Định dạng địa chỉ không hợp lệ.' })
  addressFormat?: AddressFormat;

  @ApiProperty({ example: 'Thành phố Hồ Chí Minh' })
  @Transform(trimValue)
  @IsString()
  @Length(2, 120)
  province!: string;

  @ApiPropertyOptional({ example: 'Quận 1', description: 'Chỉ dùng với địa chỉ LEGACY.' })
  @IsOptional()
  @Transform(trimValue)
  @IsString()
  @MaxLength(120)
  district?: string;

  @ApiProperty({ example: 'Phường Sài Gòn' })
  @Transform(trimValue)
  @IsString()
  @MaxLength(120)
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
  @Transform((params) => {
    // Read the raw body value before implicit Boolean conversion turns "false" into true.
    const raw: unknown = (params.obj as Record<string, unknown>)[params.key];
    return raw === null ? null : toOptionalBoolean({ ...params, value: raw });
  })
  @IsBoolean()
  isDefault?: boolean;
}
