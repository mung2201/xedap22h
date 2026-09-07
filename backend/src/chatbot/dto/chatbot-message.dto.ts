import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

const trimValue = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class ChatbotMessageDto {
  @ApiProperty({ example: 'Shop bảo hành thế nào?' })
  @Transform(trimValue)
  @IsString()
  @Length(1, 1_000)
  message!: string;
}
