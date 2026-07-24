import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  Inject,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UsePipes,
} from "@nestjs/common";
import { FastifyRequest, FastifyReply } from "fastify";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { AuthService } from "./auth.service.js";
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js";
import { RegisterDto, LoginDto, RefreshTokenDto } from "./dto/auth.dto.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";

const IS_PROD = process.env.NODE_ENV === "production";
const REFRESH_COOKIE = "botolahub_refresh";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: "strict" as const,
  path: "/api/v1/auth",
  maxAge: 30 * 24 * 60 * 60,
};

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
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  // ─── Shared Registration ───────────────────────────────────────────────────

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

  // ─── Web Authentication Flow (HTTP-Only Cookie) ───────────────────────────

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Web Login with email and password" })
  @UsePipes(new ZodValidationPipe(LoginDto))
  async webLogin(
    @Body() dto: import("./dto/auth.dto.js").LoginDtoType,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const result = await this.auth.login(
      dto,
      req.headers["user-agent"],
      req.ip,
    );

    // Set refresh token in HTTP-only cookie ONLY for web clients
    safeCookie(res, REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);

    // NEVER return refreshToken in JSON body for web
    return {
      success: true,
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    };
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Web Refresh access token using HTTP-only cookie" })
  async webRefresh(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const cookies = req.cookies as Record<string, string> | undefined;
    const rawToken = cookies?.[REFRESH_COOKIE];

    if (!rawToken) {
      throw new UnauthorizedException("No refresh token provided");
    }

    const result = await this.auth.refresh(rawToken);

    // Rotate HTTP-only cookie
    safeCookie(res, REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);

    // NEVER return refreshToken in JSON body for web
    return {
      success: true,
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Web Logout and revoke HTTP-only cookie session" })
  async webLogout(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const cookies = req.cookies as Record<string, string> | undefined;
    const rawToken = cookies?.[REFRESH_COOKIE];

    if (rawToken) {
      // Parse sessionId.secret, verify Argon2id hash, and revoke session
      await this.auth.revokeSession(rawToken).catch(() => null);
    }

    // Clear cookie using exact matching settings
    safeClearCookie(res, REFRESH_COOKIE, {
      path: "/api/v1/auth",
      httpOnly: true,
      secure: IS_PROD,
      sameSite: "strict",
    });

    return { success: true, data: { message: "Logged out successfully" } };
  }

  // ─── Mobile Authentication Flow (Expo SecureStore Transport) ─────────────

  @Post("mobile/login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mobile Login with email and password" })
  @UsePipes(new ZodValidationPipe(LoginDto))
  async mobileLogin(
    @Body() dto: import("./dto/auth.dto.js").LoginDtoType,
    @Req() req: FastifyRequest,
  ) {
    const result = await this.auth.login(
      dto,
      req.headers["user-agent"],
      req.ip,
    );

    // Explicit mobile flow: returns refreshToken in JSON body for Expo SecureStore
    return {
      success: true,
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      },
    };
  }

  @Post("mobile/refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mobile Refresh access token using response body" })
  @UsePipes(new ZodValidationPipe(RefreshTokenDto))
  async mobileRefresh(
    @Body() dto: import("./dto/auth.dto.js").RefreshTokenDtoType,
  ) {
    const result = await this.auth.refresh(dto.refreshToken);

    return {
      success: true,
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      },
    };
  }

  @Post("mobile/logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mobile Logout and revoke refresh token" })
  @UsePipes(new ZodValidationPipe(RefreshTokenDto))
  async mobileLogout(
    @Body() dto: import("./dto/auth.dto.js").RefreshTokenDtoType,
  ) {
    // Validates format, looks up sessionId, verifies secret hash, revokes session
    await this.auth.revokeSession(dto.refreshToken);

    return { success: true, data: { message: "Logged out successfully" } };
  }

  // ─── Authenticated User Profile ──────────────────────────────────────────

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
