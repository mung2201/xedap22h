import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { REFRESH_TOKEN_COOKIE } from '../common/constants/auth.constants';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { AuthenticatedUser, RequestMetadata } from '../common/interfaces/auth.interface';
import { AuthService, ClientAuthSession } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('Authentication')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register a customer account' })
  @ResponseMessage('Registration successful.')
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ClientAuthSession> {
    const session = await this.authService.register(
      dto,
      this.getRequestMetadata(request),
    );
    this.setRefreshTokenCookie(response, session.refreshToken);

    return this.authService.toClientSession(session);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Login using email or username' })
  @ResponseMessage('Login successful.')
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ClientAuthSession> {
    const session = await this.authService.login(
      dto,
      this.getRequestMetadata(request),
    );
    this.setRefreshTokenCookie(response, session.refreshToken);

    return this.authService.toClientSession(session);
  }

  @Public()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth(REFRESH_TOKEN_COOKIE)
  @ApiBody({ type: RefreshTokenDto, required: false })
  @ApiOperation({ summary: 'Rotate the refresh token and issue a new access token' })
  @ResponseMessage('Token refreshed successfully.')
  async refreshToken(
    @Body() dto: RefreshTokenDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ClientAuthSession> {
    this.assertTrustedCookieOrigin(request, dto.refreshToken);
    const refreshToken = this.getRefreshToken(request, dto.refreshToken);
    const session = await this.authService.refresh(
      refreshToken,
      this.getRequestMetadata(request),
    );
    this.setRefreshTokenCookie(response, session.refreshToken);

    return this.authService.toClientSession(session);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth(REFRESH_TOKEN_COOKIE)
  @ApiBody({ type: LogoutDto, required: false })
  @ApiOperation({ summary: 'Logout the current browser/device session' })
  @ResponseMessage('Logout successful.')
  async logout(
    @Body() dto: LogoutDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    this.assertTrustedCookieOrigin(request, dto.refreshToken);
    await this.authService.logout(dto.refreshToken ?? this.getCookieToken(request));
    this.clearRefreshTokenCookie(response);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout from all devices' })
  @ResponseMessage('All sessions have been revoked.')
  async logoutAll(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logoutAll(user.userId);
    this.clearRefreshTokenCookie(response);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 3_600_000 } })
  @ApiOperation({ summary: 'Send a password-reset email if the account exists' })
  @ResponseMessage('If the account exists, a password-reset email has been sent.')
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    await this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @ApiOperation({ summary: 'Reset a password using an email token' })
  @ResponseMessage('Password reset successfully. Please sign in again.')
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.authService.resetPassword(dto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Change password for the authenticated user' })
  @ResponseMessage('Password changed successfully.')
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ClientAuthSession> {
    const session = await this.authService.changePassword(
      user.userId,
      dto,
      this.getRequestMetadata(request),
    );
    this.setRefreshTokenCookie(response, session.refreshToken);

    return this.authService.toClientSession(session);
  }

  private getRefreshToken(request: Request, bodyToken?: string): string {
    const token = bodyToken ?? this.getCookieToken(request);

    if (!token) {
      throw new UnauthorizedException('Refresh token is required.');
    }

    return token;
  }

  private getCookieToken(request: Request): string | undefined {
    return request.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
  }

  /**
   * A refresh token in an HttpOnly cookie is normally protected by SameSite.
   * When deployments intentionally use SameSite=None for a separately hosted
   * frontend, also verify the browser origin to prevent cross-site refresh or
   * logout requests. Native/server clients may send the token in the body and
   * do not depend on this browser-only protection.
   */
  private assertTrustedCookieOrigin(
    request: Request,
    bodyRefreshToken?: string,
  ): void {
    if (bodyRefreshToken || !this.getCookieToken(request)) {
      return;
    }

    const origin = request.get('origin');
    if (!origin) {
      // Non-browser clients commonly omit Origin. They do not have ambient
      // browser cookies, so retain support for those clients.
      return;
    }

    const requestOrigin = `${request.protocol}://${request.get('host')}`;
    const trustedOrigins = new Set([
      ...this.configService.getOrThrow<string[]>('app.corsOrigins'),
      this.configService.getOrThrow<string>('app.frontendUrl'),
      requestOrigin,
    ]);

    if (!trustedOrigins.has(origin)) {
      throw new ForbiddenException('Request origin is not allowed.');
    }
  }

  private setRefreshTokenCookie(response: Response, token: string): void {
    response.cookie(REFRESH_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: this.configService.getOrThrow<boolean>('app.cookieSecure'),
      sameSite: this.configService.getOrThrow<'lax' | 'strict' | 'none'>(
        'app.cookieSameSite',
      ),
      maxAge: this.authService.getRefreshTokenMaxAge(),
      path: '/api/v1/auth',
    });
  }

  private clearRefreshTokenCookie(response: Response): void {
    response.clearCookie(REFRESH_TOKEN_COOKIE, {
      httpOnly: true,
      secure: this.configService.getOrThrow<boolean>('app.cookieSecure'),
      sameSite: this.configService.getOrThrow<'lax' | 'strict' | 'none'>(
        'app.cookieSameSite',
      ),
      path: '/api/v1/auth',
    });
  }

  private getRequestMetadata(request: Request): RequestMetadata {
    const forwardedFor = request.headers['x-forwarded-for'];
    const forwardedIp = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor?.split(',')[0]?.trim();

    return {
      ip: forwardedIp ?? request.ip,
      userAgent: request.get('user-agent') ?? undefined,
    };
  }
}
