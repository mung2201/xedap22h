import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  MaxDate,
  MaxLength,
} from 'class-validator';
import { Gender } from '../../common/enums/user-role.enum';
import { normalizeVietnameseMobile } from '../../common/utils/phone.util';

const trimValue = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateProfileDto {
  @IsOptional()
  @Transform(trimValue)
  @IsString()
  @Length(2, 120)
  fullName?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeVietnameseMobile(value) ?? value.trim() : value,
  )
  @IsString()
  @Matches(/^0[35789][0-9]{8}$/, {
    message: 'Số điện thoại phải gồm đúng 10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09.',
  })
  phone?: string | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @MaxDate(new Date())
  dateOfBirth?: Date | null;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender | null;

  @IsOptional()
  @Transform(trimValue)
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  avatarUrl?: string | null;
}
