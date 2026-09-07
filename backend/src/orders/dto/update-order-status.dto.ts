import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { OrderStatus } from '../../common/enums/commerce.enum';

const trimOptional = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() || undefined : value;

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  orderStatus!: OrderStatus;

  @ApiPropertyOptional({ description: 'Required reason when cancelling an order' })
  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  @Length(3, 500)
  note?: string;
}
