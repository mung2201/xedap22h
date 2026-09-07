import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

const trimValue = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class ProductSpecificationDto {
  @ApiProperty({ example: 'Groupset' })
  @Transform(trimValue)
  @IsString()
  @Length(1, 100)
  label!: string;

  @ApiProperty({ example: 'Shimano Deore 12 speed' })
  @Transform(trimValue)
  @IsString()
  @Length(1, 1000)
  value!: string;

  @ApiPropertyOptional({ example: 'Transmission' })
  @Transform(trimValue)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  group?: string;
}
