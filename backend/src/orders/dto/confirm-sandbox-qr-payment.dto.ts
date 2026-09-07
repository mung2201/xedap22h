import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

const trimValue = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class ConfirmSandboxQrPaymentDto {
  @ApiProperty({ example: 'QR-5e0d6382-b7fc-47f6-b9bd-d39f3b9919ce' })
  @Transform(trimValue)
  @IsString()
  @Length(39, 39)
  @Matches(/^QR-[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i, {
    message: 'paymentReference must be a valid sandbox QR payment reference.',
  })
  paymentReference!: string;
}
