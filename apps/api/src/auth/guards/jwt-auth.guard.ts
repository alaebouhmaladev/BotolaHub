import {
  Injectable,
  Inject,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { FastifyRequest } from "fastify";
import { PrismaService } from "../../prisma/prisma.service.js";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException("Missing authentication token");
    }

    let payload: { sub: string; sessionId: string; role: string };
    try {
      payload = this.jwt.verify(token);
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }

    if (!payload.sessionId || !payload.sub) {
      throw new UnauthorizedException("Invalid token payload");
    }

    // Database verification: Ensure session exists, belongs to user, and is not revoked/expired
    const session = await this.prisma.client.userSession.findUnique({
      where: { id: payload.sessionId },
    });

    if (
      !session ||
      session.userId !== payload.sub ||
      session.isRevoked ||
      session.expiresAt < new Date()
    ) {
      throw new UnauthorizedException("Session has been revoked or expired");
    }

    (request as FastifyRequest & { user: typeof payload }).user = payload;
    return true;
  }

  private extractToken(request: FastifyRequest): string | null {
    const authHeader = request.headers["authorization"];
    if (authHeader?.startsWith("Bearer ")) {
      return authHeader.slice(7);
    }
    return null;
  }
}
