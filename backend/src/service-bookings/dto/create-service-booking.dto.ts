import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { ServiceBookingType } from '../../common/enums/service-booking.enum';

const trimValue = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateServiceBookingDto {
  @ApiProperty({ enum: ServiceBookingType })
  @IsEnum(ServiceBookingType)
  serviceType!: ServiceBookingType;

  @ApiProperty({ example: 'Nguyễn Minh Anh' })
  @Transform(trimValue)
  @IsString()
  @Length(2, 120)
  contactName!: string;

  @ApiProperty({ example: '0901234567' })
  @Transform(trimValue)
  @IsString()
  @Matches(/^0[35789][0-9]{8}$/, {
    message: 'Số điện thoại phải gồm đúng 10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09.',
  })
  contactPhone!: string;

  @ApiProperty({ example: '2026-09-15T00:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  preferredDate!: Date;

  @ApiProperty({ example: '09:00 - 11:00' })
  @Transform(trimValue)
  @IsString()
  @Length(3, 40)
  preferredTimeSlot!: string;

  @ApiProperty({ example: 'XeDap22h Quận 1 / khu vực mong muốn' })
  @Transform(trimValue)
  @IsString()
  @Length(2, 160)
  serviceLocation!: string;

  @ApiPropertyOptional({ example: 'Giant' })
  @Transform(trimValue)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  bicycleBrand?: string;

  @ApiPropertyOptional({ example: 'Talon 2 2024' })
  @Transform(trimValue)
  @IsOptional()
  @IsString()
  @MaxLength(160)
  bicycleModel?: string;

  @ApiProperty({ example: 'Bảo dưỡng định kỳ, kiểm tra phanh và bộ truyền động.' })
  @Transform(trimValue)
  @IsString()
  @Length(10, 1_000)
  description!: string;
}
