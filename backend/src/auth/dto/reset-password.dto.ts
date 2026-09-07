import { ApiProperty } from '@nestjs/swagger';
import { IsHexadecimal, IsString, Length } from 'class-validator';
import { PasswordWithConfirmationDto } from './password-with-confirmation.dto';

export class ResetPasswordDto extends PasswordWithConfirmationDto {
  @ApiProperty({ description: 'Token received in the password reset email.' })
  @IsString()
  @IsHexadecimal()
  @Length(64, 64)
  token!: string;
}
