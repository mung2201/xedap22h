import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsEnum } from 'class-validator';
import { Permission } from '../../common/enums/permission.enum';

export class UpdateUserPermissionsDto {
  @ApiProperty({ enum: Permission, isArray: true })
  @IsArray()
  @ArrayUnique()
  @IsEnum(Permission, { each: true })
  permissions!: Permission[];
}
