import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';
import { PasswordWithConfirmationDto } from './password-with-confirmation.dto';

export class ChangePasswordDto extends PasswordWithConfirmationDto {
  @ApiProperty({ example: 'CurrentPassword123!' })
  @IsString()
  @Length(8, 128)
  currentPassword!: string;
}
