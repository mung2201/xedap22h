import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ServiceBookingStatus } from '../../common/enums/service-booking.enum';

const trimOptional = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() || undefined : value;

export class UpdateServiceBookingStatusDto {
  @ApiProperty({ enum: ServiceBookingStatus })
  @IsEnum(ServiceBookingStatus)
  status!: ServiceBookingStatus;

  @ApiPropertyOptional({ description: 'Visible in the customer service timeline' })
  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({ description: 'Internal staff note' })
  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MaxLength(1_000)
  adminNote?: string;
}
