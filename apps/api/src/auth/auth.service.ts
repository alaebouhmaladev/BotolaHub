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
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        preferredLanguage: true,
      },
    });

    return user;
  }

  async login(dto: LoginDtoType, userAgent?: string, ipAddress?: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

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
    const dotIndex = rawToken.indexOf(".");
    if (dotIndex === -1) {
      throw new UnauthorizedException("Invalid refresh token format");
    }

    const sessionId = rawToken.slice(0, dotIndex);
    const secret = rawToken.slice(dotIndex + 1);

    if (!sessionId || !secret) {
      throw new UnauthorizedException("Invalid refresh token format");
    }

    const session = await this.prisma.client.userSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    // Reuse detection: if a revoked token is presented, revoke all active sessions in the family
    if (session.isRevoked) {
      await this.prisma.client.userSession.updateMany({
        where: { familyId: session.familyId, isRevoked: false },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException(
        "Security breach: Refresh token reuse detected. All sessions revoked.",
      );
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException("Refresh token expired");
    }

    const validSecret = await argon2.verify(session.refreshTokenHash, secret);
    if (!validSecret) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    // Rotate transactionally with concurrency protection
    const newSecret = uuidv4() + uuidv4();
    const newSecretHash = await argon2.hash(newSecret, {
      type: argon2.argon2id,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

    const newSession = await this.prisma.client.$transaction(async (tx) => {
      const updated = await tx.userSession.updateMany({
        where: { id: session.id, isRevoked: false },
        data: { isRevoked: true },
      });

      if (updated.count === 0) {
        throw new UnauthorizedException("Concurrent refresh request failed");
      }

      const created = await tx.userSession.create({
        data: {
          userId: session.userId,
          refreshTokenHash: newSecretHash,
          familyId: session.familyId,
          userAgent: session.userAgent,
          ipAddress: session.ipAddress,
          expiresAt,
        },
      });

      await tx.userSession.update({
        where: { id: session.id },
        data: { replacedBy: created.id },
      });

      return created;
    });

    const user = await this.prisma.client.user.findUniqueOrThrow({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        preferredLanguage: true,
      },
    });

    const accessToken = this.jwt.sign(
      { sub: user.id, sessionId: newSession.id, role: user.role },
      { expiresIn: ACCESS_TOKEN_TTL },
    );

    return {
      accessToken,
      refreshToken: `${newSession.id}.${newSecret}`,
      sessionId: newSession.id,
      user,
    };
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
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        preferredLanguage: true,
        createdAt: true,
      },
    });
    if (!user) throw new UnauthorizedException("User not found");
    return user;
  }

  private async createSession(
    userId: string,
    userAgent?: string,
    ipAddress?: string,
  ) {
    const secret = uuidv4() + uuidv4();
    const refreshTokenHash = await argon2.hash(secret, {
      type: argon2.argon2id,
    });

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
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        preferredLanguage: true,
      },
    });

    const accessToken = this.jwt.sign(
      { sub: userId, sessionId: session.id, role: user.role },
      { expiresIn: ACCESS_TOKEN_TTL },
    );

    return {
      accessToken,
      refreshToken: `${session.id}.${secret}`,
      sessionId: session.id,
      user,
    };
  }
}
