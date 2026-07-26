import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { ClientType } from '@botolahub/database';
import {
  RegisterEmailDto,
  RegisterEmailDtoSchema,
  LoginEmailDto,
  LoginEmailDtoSchema,
  RequestPhoneOtpDto,
  RequestPhoneOtpDtoSchema,
  VerifyPhoneOtpDto,
  VerifyPhoneOtpDtoSchema,
  OAuthLoginDto,
  OAuthLoginDtoSchema,
  RefreshTokenDto,
} from '@botolahub/contracts';

@ApiTags('Authentication')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  private setRefreshCookie(res: FastifyReply, refreshToken: string) {
    res.header(
      'Set-Cookie',
      `refreshToken=${refreshToken}; HttpOnly; Path=/api/v1/auth; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`,
    );
  }

  private extractClientType(req: FastifyRequest): ClientType {
    const header = req.headers['client-type'] as string;
    return header?.toUpperCase() === 'MOBILE' ? ClientType.MOBILE : ClientType.WEB;
  }

  @Post('register')
  @ApiOperation({ summary: 'Register with Email and Password' })
  async register(
    @Body() body: RegisterEmailDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const dto = RegisterEmailDtoSchema.parse(body);
    const clientType = this.extractClientType(req);
    const auth = await this.authService.registerEmail(
      dto,
      clientType,
      req.headers['user-agent'],
      req.ip,
    );

    if (clientType === ClientType.WEB && auth.refreshToken) {
      this.setRefreshCookie(res, auth.refreshToken);
      delete auth.refreshToken;
    }

    return auth;
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with Email and Password' })
  async login(
    @Body() body: LoginEmailDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const dto = LoginEmailDtoSchema.parse(body);
    const clientType = this.extractClientType(req);
    const { auth, rawRefreshToken } = await this.authService.loginEmail(
      dto,
      clientType,
      req.headers['user-agent'],
      req.ip,
    );

    if (clientType === ClientType.WEB) {
      this.setRefreshCookie(res, rawRefreshToken);
    }

    return auth;
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Rotate Refresh Token and issue new Access Token' })
  async refresh(
    @Body() body: RefreshTokenDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const clientType = this.extractClientType(req);

    const cookies = req.headers.cookie
      ? Object.fromEntries(req.headers.cookie.split('; ').map((c: string) => c.split('=')))
      : {};
    const token = cookies.refreshToken || body.refreshToken;

    if (!token) {
      throw new UnauthorizedException('Missing refresh token cookie or body');
    }

    const { auth, rawRefreshToken } = await this.authService.rotateRefreshToken(
      token,
      clientType,
      req.headers['user-agent'],
      req.ip,
    );

    if (clientType === ClientType.WEB) {
      this.setRefreshCookie(res, rawRefreshToken);
    }

    return auth;
  }

  @Post('phone/request-otp')
  @ApiOperation({ summary: 'Request OTP verification code for phone number' })
  async requestPhoneOtp(@Body() body: RequestPhoneOtpDto) {
    const dto = RequestPhoneOtpDtoSchema.parse(body);
    return this.authService.requestPhoneOtp(dto);
  }

  @Post('phone/verify-otp')
  @ApiOperation({ summary: 'Verify phone OTP code and login' })
  async verifyPhoneOtp(
    @Body() body: VerifyPhoneOtpDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const dto = VerifyPhoneOtpDtoSchema.parse(body);
    const clientType = this.extractClientType(req);
    const { auth, rawRefreshToken } = await this.authService.verifyPhoneOtp(dto, clientType);

    if (clientType === ClientType.WEB) {
      this.setRefreshCookie(res, rawRefreshToken);
    }

    return auth;
  }

  @Post('oauth/login')
  @ApiOperation({ summary: 'Login or Link Account with OAuth Provider' })
  async oauthLogin(
    @Body() body: OAuthLoginDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const dto = OAuthLoginDtoSchema.parse(body);
    const clientType = this.extractClientType(req);
    const result = await this.authService.loginOAuth(dto, clientType);

    if (result.challenge) {
      return result.challenge;
    }

    if (clientType === ClientType.WEB && result.rawRefreshToken) {
      this.setRefreshCookie(res, result.rawRefreshToken);
    }

    return result.auth;
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout and revoke current refresh session' })
  async logout(@Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const cookies = req.headers.cookie
      ? Object.fromEntries(req.headers.cookie.split('; ').map((c: string) => c.split('=')))
      : {};
    const token = cookies.refreshToken || (req.body as any)?.refreshToken;

    if (token) {
      await this.authService.logout(token);
    }

    res.header('Set-Cookie', 'refreshToken=; HttpOnly; Path=/api/v1/auth; Max-Age=0');
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  async getMe(@Req() req: any) {
    return this.authService.getMe(req.user.sub);
  }

  @Post('revoke-sessions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Revoke all sessions for current user' })
  async revokeSessions(@Req() req: any) {
    return this.authService.revokeAllSessions(req.user.sub);
  }
}
