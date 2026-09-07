import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Permission } from '../../common/enums/permission.enum';
import { UserStatus } from '../../common/enums/user-role.enum';
import {
  AuthenticatedUser,
  JwtPayload,
} from '../../common/interfaces/auth.interface';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.accessSecret'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid access token.');
    }

    const user = await this.usersService.findByIdForAuthentication(payload.sub);

    if (
      !user ||
      user.status !== UserStatus.ACTIVE ||
      user.tokenVersion !== payload.tokenVersion
    ) {
      throw new UnauthorizedException('Session is no longer valid.');
    }

    return {
      userId: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
      permissions: (user.permissions ?? []) as Permission[],
      tokenVersion: user.tokenVersion,
    };
  }
}
