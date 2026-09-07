import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsMongoId, IsString, Length } from 'class-validator';

const trimValue = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class RecommendationMessageDto {
  @ApiProperty({ description: 'Session id returned by the recommendation start endpoint' })
  @IsMongoId()
  sessionId!: string;

  @ApiProperty({
    example: 'COMMUTE',
    description:
      'One option value for PURPOSE/BUDGET, or an integer height in centimetres for HEIGHT.',
  })
  @Transform(trimValue)
  @IsString()
  @Length(1, 40)
  answer!: string;
}
