import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { v4 as uuidv4 } from "uuid";
import { PrismaService } from "../prisma/prisma.service.js";
import { RegisterDtoType, LoginDtoType } from "./dto/auth.dto.js";

const ACCESS_TOKEN_TTL = 15 * 60; // 15 minutes in seconds
const REFRESH_TOKEN_TTL_DAYS = 30;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDtoType) {
    const existing = await this.prisma.client.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const user = await this.prisma.client.user.create({
      data: {
        email: dto.email.toLowerCase(),
        displayName: dto.displayName,
        passwordHash,
        preferredLanguage: dto.preferredLanguage,
      },
      select: { id: true, email: true, displayName: true, role: true, preferredLanguage: true },
    });

    return user;
  }

  async login(dto: LoginDtoType, userAgent?: string, ipAddress?: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    // Generic error – do not reveal whether email exists
    const INVALID_MSG = "Invalid credentials";

    if (!user) {
      throw new UnauthorizedException(INVALID_MSG);
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException(INVALID_MSG);
    }

    return this.createSession(user.id, userAgent, ipAddress);
  }

  async refresh(rawToken: string) {
    // Load candidate sessions (non-revoked, non-expired)
    const sessions = await this.prisma.client.userSession.findMany({
      where: { isRevoked: false, expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    let matched: (typeof sessions)[0] | null = null;
    for (const s of sessions) {
      try {
        const ok = await argon2.verify(s.refreshTokenHash, rawToken);
        if (ok) {
          matched = s;
          break;
        }
      } catch {
        // hash mismatch – continue
      }
    }

    if (!matched) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    // Rotate: revoke old, create new
    await this.prisma.client.userSession.update({
      where: { id: matched.id },
      data: { isRevoked: true },
    });

    return this.createSession(matched.userId, matched.userAgent ?? undefined, matched.ipAddress ?? undefined);
  }

  async logout(sessionId: string) {
    await this.prisma.client.userSession.updateMany({
      where: { id: sessionId },
      data: { isRevoked: true },
    });
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, displayName: true, role: true, preferredLanguage: true, createdAt: true },
    });
    if (!user) throw new UnauthorizedException("User not found");
    return user;
  }

  async validateAccessToken(token: string) {
    try {
      const payload = this.jwt.verify<{ sub: string; sessionId: string }>(token);
      return payload;
    } catch {
      throw new UnauthorizedException("Invalid or expired access token");
    }
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  private async createSession(userId: string, userAgent?: string, ipAddress?: string) {
    const rawRefreshToken = uuidv4() + "-" + uuidv4();
    const refreshTokenHash = await argon2.hash(rawRefreshToken, { type: argon2.argon2id });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

    const session = await this.prisma.client.userSession.create({
      data: {
        userId,
        refreshTokenHash,
        userAgent,
        ipAddress,
        expiresAt,
      },
    });

    const user = await this.prisma.client.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, displayName: true, role: true, preferredLanguage: true },
    });

    const accessToken = this.jwt.sign(
      { sub: userId, sessionId: session.id, role: user.role },
      { expiresIn: ACCESS_TOKEN_TTL },
    );

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      sessionId: session.id,
      user,
    };
  }
}
