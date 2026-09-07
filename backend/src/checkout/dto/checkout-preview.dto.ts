import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';
import { ShippingMethod } from '../../common/enums/commerce.enum';

const normalizeVoucherCode = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() || undefined : value;

export class CheckoutPreviewDto {
  @ApiProperty({ description: 'Owned Address MongoDB ObjectId' })
  @IsMongoId()
  addressId!: string;

  @ApiPropertyOptional({ example: 'BIKE10' })
  @IsOptional()
  @Transform(normalizeVoucherCode)
  @IsString()
  @MaxLength(64)
  voucherCode?: string;

  @ApiPropertyOptional({ enum: ShippingMethod, default: ShippingMethod.STANDARD })
  @IsOptional()
  @IsEnum(ShippingMethod)
  shippingMethod: ShippingMethod = ShippingMethod.STANDARD;
}
