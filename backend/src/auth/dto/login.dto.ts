import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 255)
  emailOrUsername!: string;

  @ApiProperty({ example: 'ChangeMe123!' })
  @IsString()
  @Length(8, 128)
  password!: string;
}
