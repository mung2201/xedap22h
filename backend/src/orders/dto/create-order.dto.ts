import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { PaymentMethod } from '../../common/enums/commerce.enum';
import { CheckoutPreviewDto } from '../../checkout/dto/checkout-preview.dto';

const trimOptional = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() || undefined : value;

const normalizeOptionalEmail = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() || undefined : value;

export class CreateOrderDto extends CheckoutPreviewDto {
  @ApiProperty({ enum: PaymentMethod, default: PaymentMethod.COD })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod = PaymentMethod.COD;

  @ApiPropertyOptional({
    example: 'customer@example.com',
    description:
      'Email used only for this order receipt and payment notifications.',
  })
  @IsOptional()
  @Transform(normalizeOptionalEmail)
  @IsEmail()
  @MaxLength(255)
  customerEmail?: string;

  @ApiPropertyOptional({ example: 'Call before delivery.' })
  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  @Length(2, 500)
  note?: string;
}
