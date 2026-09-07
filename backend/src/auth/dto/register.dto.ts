import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, Matches } from 'class-validator';
import { PasswordWithConfirmationDto } from './password-with-confirmation.dto';

const trimValue = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class RegisterDto extends PasswordWithConfirmationDto {
  @ApiProperty({ example: 'Nguyen Van An' })
  @Transform(trimValue)
  @IsString()
  @Length(2, 120)
  fullName!: string;

  @ApiProperty({ example: 'nguyenvanan' })
  @Transform(trimValue)
  @IsString()
  @Matches(/^[a-zA-Z0-9._-]{3,40}$/, {
    message:
      'Username must be 3-40 characters and contain only letters, numbers, dots, underscores, or hyphens.',
  })
  username!: string;

  @ApiProperty({ example: 'an@example.com' })
  @Transform(trimValue)
  @IsEmail()
  @Length(5, 255)
  email!: string;
}
