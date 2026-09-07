import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';

export class TrackOrderDto {
  @ApiProperty({ example: 'ORD-20260830-A1B2C3D4E5F6' })
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Matches(/^ORD-[A-Z0-9-]{8,48}$/)
  orderCode!: string;

  @ApiProperty({ example: '0901234567' })
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.replace(/\D/g, '') : value,
  )
  @IsString()
  @Matches(/^\d{8,15}$/)
  phone!: string;
}
