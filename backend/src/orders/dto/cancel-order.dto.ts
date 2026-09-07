import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

const trimValue = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CancelOrderDto {
  @ApiProperty({ example: 'Tôi muốn đổi sang màu khác.' })
  @Transform(trimValue)
  @IsString()
  @Length(3, 500)
  reason!: string;
}
