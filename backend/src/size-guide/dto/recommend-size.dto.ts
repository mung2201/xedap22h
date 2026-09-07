import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, Max, Min } from 'class-validator';
import { BikeType } from '../../common/enums/catalog.enum';

export class RecommendSizeDto {
  @ApiProperty({ example: 170, minimum: 100, maximum: 250 })
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(250)
  heightCm!: number;

  @ApiProperty({ enum: BikeType, example: BikeType.MOUNTAIN })
  @IsEnum(BikeType)
  bikeType!: BikeType;
}
