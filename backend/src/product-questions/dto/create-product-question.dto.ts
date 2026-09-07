import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsString, MaxLength, MinLength } from 'class-validator';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateProductQuestionDto {
  @ApiProperty({ description: 'Product MongoDB id' })
  @IsMongoId()
  productId!: string;

  @ApiProperty({
    example: 'Xe co phu hop voi nguoi cao 1m72 va di lam hang ngay khong?',
    minLength: 5,
    maxLength: 1500,
  })
  @Transform(trimString)
  @IsString()
  @MinLength(5)
  @MaxLength(1500)
  question!: string;
}
