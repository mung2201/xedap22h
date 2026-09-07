import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { Model } from 'mongoose';
import { UserRole, UserStatus } from '../common/enums/user-role.enum';
import {
  JwtPayload,
  RequestMetadata,
} from '../common/interfaces/auth.interface';
import { durationToMilliseconds } from '../common/utils/duration.util';
import { MailService } from '../mail/mail.service';
import { UserDocument } from '../users/schemas/user.schema';
import { PublicUser, UsersService } from '../users/users.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import {
  RefreshToken,
} from './schemas/refresh-token.schema';

interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

// A bcrypt hash for a deliberately invalid value. Comparing against it when
// the account is absent keeps login response timing comparable and avoids
// making account discovery easier through timing measurements.
const PASSWORD_TIMING_HASH =
  '$2b$12$Uo4VzTcsQnHpMcLklUuofu6nRKLxQnC4Q9JM7urfNu6D057dULGmC';

export interface ClientAuthSession {
  accessToken: string;
  user: PublicUser;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshToken>,
  ) {}

  async register(
    dto: RegisterDto,
    metadata: RequestMetadata,
  ): Promise<AuthSession> {
    const passwordHash = await this.hashPassword(dto.password);
    const user = await this.usersService.create({
      fullName: dto.fullName,
      username: dto.username,
      email: dto.email,
      passwordHash,
      role: UserRole.CUSTOMER,
    });

    return this.issueSession(user, metadata);
  }

  async login(dto: LoginDto, metadata: RequestMetadata): Promise<AuthSession> {
    const user = await this.usersService.findByIdentifierWithPassword(
      dto.emailOrUsername,
    );

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user?.passwordHash ?? PASSWORD_TIMING_HASH,
    );

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid email/username or password.');
    }

    this.assertUserCanAuthenticate(user.status);
    return this.issueSession(user, metadata);
  }

  async refresh(
    rawRefreshToken: string,
    metadata: RequestMetadata,
  ): Promise<AuthSession> {
    const payload = await this.verifyRefreshToken(rawRefreshToken);

    const tokenRecord = await this.refreshTokenModel
      .findOne({
        jti: payload.jti,
        user: payload.sub,
        revokedAt: { $exists: false },
        expiresAt: { $gt: new Date() },
      })
      .select('+tokenHash')
      .exec();

    if (!tokenRecord || !(await bcrypt.compare(rawRefreshToken, tokenRecord.tokenHash))) {
      throw new UnauthorizedException('Refresh token is invalid or expired.');
    }

    const revokedToken = await this.refreshTokenModel
      .findOneAndUpdate(
        { _id: tokenRecord._id, revokedAt: { $exists: false } },
        { $set: { revokedAt: new Date() } },
        { new: true },
      )
      .exec();

    if (!revokedToken) {
      throw new UnauthorizedException('Refresh token has already been used.');
    }

    const user = await this.usersService.findByIdForAuthentication(payload.sub);

    if (!user || user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Session is no longer valid.');
    }

    this.assertUserCanAuthenticate(user.status);
    return this.issueSession(user, metadata);
  }

  async logout(rawRefreshToken?: string): Promise<void> {
    if (!rawRefreshToken) {
      return;
    }

    try {
      const payload = await this.verifyRefreshToken(rawRefreshToken);

      await this.refreshTokenModel
        .updateOne(
          { jti: payload.jti, user: payload.sub, revokedAt: { $exists: false } },
          { $set: { revokedAt: new Date() } },
        )
        .exec();
    } catch {
      // Logout is intentionally idempotent and must clear the browser cookie.
    }
  }

  async logoutAll(userId: string): Promise<void> {
    // Revoking refresh records alone leaves already-issued access tokens usable
    // until they expire. Bumping tokenVersion invalidates them immediately.
    await Promise.all([
      this.usersService.invalidateAllSessions(userId),
      this.revokeAllRefreshTokens(userId),
    ]);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.usersService.findByEmail(dto.email);

    // Do not reveal whether an email address exists.
    if (!user || user.status !== UserStatus.ACTIVE) {
      return;
    }

    const plainToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(plainToken).digest('hex');
    const expiresAt = new Date(
      Date.now() +
        this.configService.getOrThrow<number>(
          'passwordReset.expiresInMinutes',
        ) *
          60_000,
    );

    await this.usersService.setPasswordResetToken(
      user._id.toString(),
      tokenHash,
      expiresAt,
    );

    const frontendUrl = this.configService.getOrThrow<string>('app.frontendUrl');
    const resetUrl = `${frontendUrl}/reset-password?token=${plainToken}`;

    try {
      await this.mailService.sendPasswordResetEmail({
        to: user.email,
        fullName: user.fullName,
        resetUrl,
      });
    } catch (error) {
      // Keep this endpoint indistinguishable for existing/non-existing users.
      // Delivery failures are operational concerns and must not become an email
      // enumeration oracle for callers.
      this.logger.error(
        'Unable to deliver a password-reset email.',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const user = await this.usersService.findByResetTokenHash(tokenHash);

    if (!user) {
      throw new BadRequestException('Password reset token is invalid or expired.');
    }

    await this.usersService.resetPassword(user, await this.hashPassword(dto.password));
    await this.revokeAllRefreshTokens(user._id.toString());
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    metadata: RequestMetadata,
  ): Promise<AuthSession> {
    const user = await this.usersService.findByIdWithPassword(userId);

    if (!user || !(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Current password is incorrect.');
    }

    this.assertUserCanAuthenticate(user.status);
    const updatedUser = await this.usersService.updatePassword(
      userId,
      await this.hashPassword(dto.password),
    );
    await this.revokeAllRefreshTokens(userId);

    return this.issueSession(updatedUser, metadata);
  }

  toClientSession(session: AuthSession): ClientAuthSession {
    return {
      accessToken: session.accessToken,
      user: session.user,
    };
  }

  getRefreshTokenMaxAge(): number {
    return durationToMilliseconds(
      this.configService.getOrThrow<string>('jwt.refreshExpiresIn'),
    );
  }

  private async issueSession(
    user: UserDocument,
    metadata: RequestMetadata,
  ): Promise<AuthSession> {
    const userId = user._id.toString();
    const commonPayload: Omit<JwtPayload, 'type' | 'jti'> = {
      sub: userId,
      email: user.email,
      role: user.role,
      permissions: user.permissions ?? [],
      tokenVersion: user.tokenVersion,
    };
    const refreshJti = randomUUID();

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { ...commonPayload, type: 'access' satisfies JwtPayload['type'] },
        this.jwtSignOptions('jwt.accessSecret', 'jwt.accessExpiresIn'),
      ),
      this.jwtService.signAsync(
        {
          ...commonPayload,
          type: 'refresh' satisfies JwtPayload['type'],
          jti: refreshJti,
        },
        this.jwtSignOptions('jwt.refreshSecret', 'jwt.refreshExpiresIn'),
      ),
    ]);

    await this.refreshTokenModel.create({
      user: user._id,
      jti: refreshJti,
      tokenHash: await bcrypt.hash(refreshToken, this.getBcryptSaltRounds()),
      expiresAt: new Date(Date.now() + this.getRefreshTokenMaxAge()),
      ...(metadata.userAgent ? { userAgent: metadata.userAgent } : {}),
      ...(metadata.ip ? { ip: metadata.ip } : {}),
    });

    return {
      accessToken,
      refreshToken,
      user: this.usersService.toPublicUser(user),
    };
  }

  private async verifyRefreshToken(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      });

      if (payload.type !== 'refresh' || !payload.jti) {
        throw new UnauthorizedException('Invalid refresh token.');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Refresh token is invalid or expired.');
    }
  }

  private jwtSignOptions(
    secretKey: string,
    expiresInKey: string,
  ): JwtSignOptions {
    return {
      secret: this.configService.getOrThrow<string>(secretKey),
      expiresIn: this.configService.getOrThrow<JwtSignOptions['expiresIn']>(
        expiresInKey,
      ),
    };
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.getBcryptSaltRounds());
  }

  private getBcryptSaltRounds(): number {
    return this.configService.getOrThrow<number>('security.bcryptSaltRounds');
  }

  private async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.refreshTokenModel
      .updateMany(
        { user: userId, revokedAt: { $exists: false } },
        { $set: { revokedAt: new Date() } },
      )
      .exec();
  }

  private assertUserCanAuthenticate(status: UserStatus): void {
    if (status === UserStatus.LOCKED) {
      throw new ForbiddenException('This account is locked.');
    }

    if (status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('This account is inactive.');
    }
  }
}
