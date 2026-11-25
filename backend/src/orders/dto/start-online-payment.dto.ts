import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

export class StartOnlinePaymentDto {
  @ApiProperty({ description: 'The payment reference returned with the owned order.' })
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Length(8, 160)
  paymentReference!: string;
}
