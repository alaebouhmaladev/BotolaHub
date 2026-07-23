import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UsePipes,
} from "@nestjs/common";
import { FastifyRequest, FastifyReply } from "fastify";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "./auth.service.js";
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js";
import { RegisterDto, LoginDto } from "./dto/auth.dto.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";

const IS_PROD = process.env.NODE_ENV === "production";
const REFRESH_COOKIE = "botolahub_refresh";
const SESSION_COOKIE = "botolahub_session";

function safeCookie(
  res: FastifyReply,
  name: string,
  value: string,
  opts: Parameters<FastifyReply["setCookie"]>[2],
) {
  try {
    (
      res as FastifyReply & {
        setCookie: (n: string, v: string, o: object) => void;
      }
    ).setCookie(name, value, opts ?? {});
  } catch {
    // setCookie not available (test environment without @fastify/cookie)
  }
}

function safeClearCookie(res: FastifyReply, name: string, opts: object) {
  try {
    (
      res as FastifyReply & { clearCookie: (n: string, o: object) => void }
    ).clearCookie(name, opts);
  } catch {
    // clearCookie not available
  }
}

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly jwt: JwtService,
  ) {}

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Register a new user" })
  @UsePipes(new ZodValidationPipe(RegisterDto))
  async register(@Body() dto: import("./dto/auth.dto.js").RegisterDtoType) {
    const user = await this.auth.register(dto);
    return {
      success: true,
      data: { user },
    };
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login with email and password" })
  @UsePipes(new ZodValidationPipe(LoginDto))
  async login(
    @Body() dto: import("./dto/auth.dto.js").LoginDtoType,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const result = await this.auth.login(
      dto,
      req.headers["user-agent"],
      req.ip,
    );

    // Set refresh token in HTTP-only cookie for web clients
    safeCookie(res, REFRESH_COOKIE, result.refreshToken, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: "strict",
      path: "/api/v1/auth",
      maxAge: 30 * 24 * 60 * 60,
    });

    safeCookie(res, SESSION_COOKIE, result.sessionId, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: "strict",
      path: "/api/v1/auth/logout",
    });

    return {
      success: true,
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      },
    };
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Refresh access token using refresh token cookie or body",
  })
  async refresh(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const cookies = req.cookies as Record<string, string> | undefined;
    const body = req.body as Record<string, string> | undefined;
    const rawToken = cookies?.[REFRESH_COOKIE] || body?.refreshToken;

    if (!rawToken) {
      throw new UnauthorizedException("No refresh token provided");
    }

    const result = await this.auth.refresh(rawToken);

    safeCookie(res, REFRESH_COOKIE, result.refreshToken, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: "strict",
      path: "/api/v1/auth",
      maxAge: 30 * 24 * 60 * 60,
    });

    return {
      success: true,
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      },
    };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Logout and revoke session" })
  async logout(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const cookies = req.cookies as Record<string, string> | undefined;
    const body = req.body as Record<string, string> | undefined;

    let sessionId = cookies?.[SESSION_COOKIE] || body?.sessionId;

    if (!sessionId && body?.refreshToken && body.refreshToken.includes(".")) {
      sessionId = body.refreshToken.split(".")[0];
    }

    if (!sessionId) {
      const authHeader = req.headers["authorization"];
      if (authHeader?.startsWith("Bearer ")) {
        try {
          const token = authHeader.slice(7);
          const payload = this.jwt.decode<{ sessionId?: string }>(token);
          if (payload?.sessionId) {
            sessionId = payload.sessionId;
          }
        } catch {
          // ignore decode error
        }
      }
    }

    if (sessionId) {
      await this.auth.logout(sessionId);
    }

    safeClearCookie(res, REFRESH_COOKIE, { path: "/api/v1/auth" });
    safeClearCookie(res, SESSION_COOKIE, { path: "/api/v1/auth/logout" });

    return { success: true, data: { message: "Logged out successfully" } };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current authenticated user" })
  async me(@Req() req: FastifyRequest) {
    const user = (req as FastifyRequest & { user: { sub: string } }).user;
    const userData = await this.auth.getCurrentUser(user.sub);
    return { success: true, data: { user: userData } };
  }
}
