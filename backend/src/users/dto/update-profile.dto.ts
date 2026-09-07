import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUrl,
  Length,
  MaxDate,
  MaxLength,
} from 'class-validator';
import { Gender } from '../../common/enums/user-role.enum';

const trimValue = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateProfileDto {
  @IsOptional()
  @Transform(trimValue)
  @IsString()
  @Length(2, 120)
  fullName?: string;

  @IsOptional()
  @Transform(trimValue)
  @IsPhoneNumber('VN')
  phone?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @MaxDate(new Date())
  dateOfBirth?: Date;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @Transform(trimValue)
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  avatarUrl?: string;
}
