import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';
import { IsFieldMatch } from '../../common/validators/is-field-match.validator';

export class PasswordWithConfirmationDto {
  @ApiProperty({ example: 'ChangeMe123!' })
  @IsString()
  @Length(8, 128)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must contain at least one lowercase letter, one uppercase letter, and one number.',
  })
  password!: string;

  @ApiProperty({ example: 'ChangeMe123!' })
  @IsString()
  @IsFieldMatch('password', { message: 'Confirm password must match password.' })
  confirmPassword!: string;
}
