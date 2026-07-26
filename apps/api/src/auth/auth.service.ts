import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { prisma, UserRole, IdentityType, ClientType, OAuthProvider } from '@botolahub/database';
import { Argon2Service } from './argon2.service.js';
import { createHash, randomUUID } from 'node:crypto';
import {
  RegisterEmailDto,
  LoginEmailDto,
  RequestPhoneOtpDto,
  VerifyPhoneOtpDto,
  OAuthLoginDto,
  AuthResponse,
} from '@botolahub/contracts';

@Injectable()
export class AuthService {
  constructor(private argon2Service: Argon2Service) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateAccessToken(user: {
    id: string;
    email: string | null;
    role: UserRole;
    isProfileCompleted: boolean;
  }): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        sub: user.id,
        email: user.email,
        role: user.role,
        isProfileCompleted: user.isProfileCompleted,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 15 * 60,
      }),
    ).toString('base64url');
    const signature = createHash('sha256')
      .update(`${header}.${payload}.secret`)
      .digest('base64url');
    return `${header}.${payload}.${signature}`;
  }

  private async createSession(
    userId: string,
    clientType: ClientType = ClientType.WEB,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const accessToken = this.generateAccessToken(user);

    const refreshToken = randomUUID();
    const refreshTokenHash = this.hashToken(refreshToken);

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.userSession.create({
      data: {
        userId,
        refreshTokenHash,
        expiresAt,
        clientType,
        userAgent,
        ipAddress,
      },
    });

    return { accessToken, refreshToken };
  }

  async registerEmail(
    dto: RegisterEmailDto,
    clientType: ClientType = ClientType.WEB,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthResponse> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      throw new ConflictException('An account with this email address already exists');
    }

    const passwordHash = await this.argon2Service.hash(dto.password);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        role: UserRole.USER,
        isProfileCompleted: false,
        identities: {
          create: {
            type: IdentityType.EMAIL_PASSWORD,
            identifier: normalizedEmail,
            passwordHash,
            isVerified: true,
          },
        },
      },
    });

    const { accessToken, refreshToken } = await this.createSession(
      user.id,
      clientType,
      userAgent,
      ipAddress,
    );

    return {
      accessToken,
      refreshToken: clientType === ClientType.MOBILE ? refreshToken : undefined,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isProfileCompleted: user.isProfileCompleted,
      },
    };
  }

  async loginEmail(
    dto: LoginEmailDto,
    clientType: ClientType = ClientType.WEB,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{ auth: AuthResponse; rawRefreshToken: string }> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const identity = await prisma.userIdentity.findUnique({
      where: {
        type_identifier: {
          type: IdentityType.EMAIL_PASSWORD,
          identifier: normalizedEmail,
        },
      },
      include: { user: true },
    });

    if (!identity || !identity.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = await this.argon2Service.verify(identity.passwordHash, dto.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const { accessToken, refreshToken } = await this.createSession(
      identity.userId,
      clientType,
      userAgent,
      ipAddress,
    );

    return {
      auth: {
        accessToken,
        refreshToken: clientType === ClientType.MOBILE ? refreshToken : undefined,
        user: {
          id: identity.user.id,
          email: identity.user.email,
          role: identity.user.role,
          isProfileCompleted: identity.user.isProfileCompleted,
        },
      },
      rawRefreshToken: refreshToken,
    };
  }

  async rotateRefreshToken(
    providedRefreshToken: string,
    clientType: ClientType = ClientType.WEB,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{ auth: AuthResponse; rawRefreshToken: string }> {
    const providedHash = this.hashToken(providedRefreshToken);

    const session = await prisma.userSession.findUnique({
      where: { refreshTokenHash: providedHash },
      include: { user: true },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (session.isRevoked || session.replacedByTokenId) {
      console.warn(
        `🚨 Security Alert: Refresh token reuse detected for userId: ${session.userId}. Revoking all sessions!`,
      );
      await prisma.userSession.updateMany({
        where: { userId: session.userId },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException(
        'Security breach detected: Revoking all sessions due to token reuse',
      );
    }

    if (session.expiresAt < new Date()) {
      await prisma.userSession.update({
        where: { id: session.id },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException('Refresh token expired');
    }

    const newSession = await this.createSession(session.userId, clientType, userAgent, ipAddress);
    const newSessionHash = this.hashToken(newSession.refreshToken);

    const newSessionRecord = await prisma.userSession.findUniqueOrThrow({
      where: { refreshTokenHash: newSessionHash },
    });

    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        isRevoked: true,
        replacedByTokenId: newSessionRecord.id,
      },
    });

    return {
      auth: {
        accessToken: newSession.accessToken,
        refreshToken: clientType === ClientType.MOBILE ? newSession.refreshToken : undefined,
        user: {
          id: session.user.id,
          email: session.user.email,
          role: session.user.role,
          isProfileCompleted: session.user.isProfileCompleted,
        },
      },
      rawRefreshToken: newSession.refreshToken,
    };
  }

  async requestPhoneOtp(
    dto: RequestPhoneOtpDto,
  ): Promise<{ message: string; challengeId: string }> {
    const phoneNumber = dto.phoneNumber.trim();

    await prisma.phoneVerificationChallenge.updateMany({
      where: { phoneNumber, isUsed: false },
      data: { isUsed: true },
    });

    const otpCode =
      process.env.NODE_ENV === 'production'
        ? Math.floor(100000 + Math.random() * 900000).toString()
        : '123456';
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const challenge = await prisma.phoneVerificationChallenge.create({
      data: {
        phoneNumber,
        otpCode,
        expiresAt,
      },
    });

    console.log(`📱 [Phone OTP] Code generated for ${phoneNumber}: ${otpCode}`);

    return {
      message: 'OTP verification code sent',
      challengeId: challenge.id,
    };
  }

  async verifyPhoneOtp(
    dto: VerifyPhoneOtpDto,
    clientType: ClientType = ClientType.WEB,
  ): Promise<{ auth: AuthResponse; rawRefreshToken: string }> {
    const phoneNumber = dto.phoneNumber.trim();

    const challenge = await prisma.phoneVerificationChallenge.findFirst({
      where: { phoneNumber, isUsed: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge) {
      throw new BadRequestException('No active verification challenge found for this phone number');
    }

    if (challenge.expiresAt < new Date()) {
      await prisma.phoneVerificationChallenge.update({
        where: { id: challenge.id },
        data: { isUsed: true },
      });
      throw new BadRequestException('OTP code has expired');
    }

    if (challenge.attempts >= 3) {
      await prisma.phoneVerificationChallenge.update({
        where: { id: challenge.id },
        data: { isUsed: true },
      });
      throw new BadRequestException('Maximum verification attempts exceeded');
    }

    if (challenge.otpCode !== dto.otpCode) {
      await prisma.phoneVerificationChallenge.update({
        where: { id: challenge.id },
        data: { attempts: challenge.attempts + 1 },
      });
      throw new BadRequestException('Invalid OTP code');
    }

    await prisma.phoneVerificationChallenge.update({
      where: { id: challenge.id },
      data: { isUsed: true },
    });

    const identity = await prisma.userIdentity.findUnique({
      where: {
        type_identifier: {
          type: IdentityType.PHONE_OTP,
          identifier: phoneNumber,
        },
      },
      include: { user: true },
    });

    let userId: string;

    if (!identity) {
      const newUser = await prisma.user.create({
        data: {
          role: UserRole.USER,
          isProfileCompleted: false,
          identities: {
            create: {
              type: IdentityType.PHONE_OTP,
              identifier: phoneNumber,
              isVerified: true,
            },
          },
        },
      });
      userId = newUser.id;
    } else {
      userId = identity.userId;
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const { accessToken, refreshToken } = await this.createSession(userId, clientType);

    return {
      auth: {
        accessToken,
        refreshToken: clientType === ClientType.MOBILE ? refreshToken : undefined,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isProfileCompleted: user.isProfileCompleted,
        },
      },
      rawRefreshToken: refreshToken,
    };
  }

  async loginOAuth(
    dto: OAuthLoginDto,
    clientType: ClientType = ClientType.WEB,
  ): Promise<{ auth?: AuthResponse; challenge?: any; rawRefreshToken?: string }> {
    if (
      dto.provider === 'GOOGLE' &&
      (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID.includes('placeholder'))
    ) {
      throw new ServiceUnavailableException(
        'Social authentication is currently unavailable for provider: GOOGLE',
      );
    }
    if (
      dto.provider === 'FACEBOOK' &&
      (!process.env.FACEBOOK_APP_ID || process.env.FACEBOOK_APP_ID.includes('placeholder'))
    ) {
      throw new ServiceUnavailableException(
        'Social authentication is currently unavailable for provider: FACEBOOK',
      );
    }
    if (
      dto.provider === 'APPLE' &&
      (!process.env.APPLE_CLIENT_ID || process.env.APPLE_CLIENT_ID.includes('placeholder'))
    ) {
      throw new ServiceUnavailableException(
        'Social authentication is currently unavailable for provider: APPLE',
      );
    }

    const providerSubject = `sub_${dto.provider.toLowerCase()}_${dto.token.substring(0, 10)}`;
    const oauthEmail = `social_${dto.provider.toLowerCase()}@example.com`;

    const oauthAccount = await prisma.oAuthAccount.findUnique({
      where: {
        provider_providerSubject: {
          provider: dto.provider as OAuthProvider,
          providerSubject,
        },
      },
      include: { user: true },
    });

    if (oauthAccount) {
      const { accessToken, refreshToken } = await this.createSession(
        oauthAccount.userId,
        clientType,
      );
      return {
        auth: {
          accessToken,
          refreshToken: clientType === ClientType.MOBILE ? refreshToken : undefined,
          user: {
            id: oauthAccount.user.id,
            email: oauthAccount.user.email,
            role: oauthAccount.user.role,
            isProfileCompleted: oauthAccount.user.isProfileCompleted,
          },
        },
        rawRefreshToken: refreshToken,
      };
    }

    const existingEmailUser = await prisma.user.findUnique({ where: { email: oauthEmail } });
    if (existingEmailUser && !dto.linkUserId) {
      return {
        challenge: {
          error: 'ACCOUNT_LINKING_REQUIRED',
          message: `An account with email ${oauthEmail} already exists. Explicit confirmation is required to link social provider.`,
          existingEmail: oauthEmail,
          provider: dto.provider,
        },
      };
    }

    const userId =
      dto.linkUserId ||
      (existingEmailUser
        ? existingEmailUser.id
        : (
            await prisma.user.create({
              data: {
                email: oauthEmail,
                role: UserRole.USER,
                isProfileCompleted: false,
              },
            })
          ).id);

    await prisma.oAuthAccount.create({
      data: {
        userId,
        provider: dto.provider as OAuthProvider,
        providerSubject,
        email: oauthEmail,
      },
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const { accessToken, refreshToken } = await this.createSession(userId, clientType);

    return {
      auth: {
        accessToken,
        refreshToken: clientType === ClientType.MOBILE ? refreshToken : undefined,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isProfileCompleted: user.isProfileCompleted,
        },
      },
      rawRefreshToken: refreshToken,
    };
  }

  async logout(refreshToken: string): Promise<{ success: boolean }> {
    const hash = this.hashToken(refreshToken);
    await prisma.userSession.updateMany({
      where: { refreshTokenHash: hash },
      data: { isRevoked: true },
    });
    return { success: true };
  }

  async revokeAllSessions(userId: string): Promise<{ success: boolean }> {
    await prisma.userSession.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
    return { success: true };
  }

  async getMe(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: { favoriteClub: true },
        },
      },
    });
  }
}
