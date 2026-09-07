import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsJWT, IsOptional, IsString } from 'class-validator';

export class LogoutDto {
  @ApiPropertyOptional({
    description:
      'Optional when the HttpOnly refresh-token cookie is present. Useful for non-browser clients.',
  })
  @IsOptional()
  @IsString()
  @IsJWT()
  refreshToken?: string;
}
