import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { NestFastifyApplication } from "@nestjs/platform-fastify";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { AppModule } from "../app.module.js";
import { GlobalExceptionFilter } from "../common/filters/global-exception.filter.js";
import { PrismaService } from "../prisma/prisma.service.js";

async function buildApp() {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
  );
  app.setGlobalPrefix("api/v1");
  app.useGlobalFilters(new GlobalExceptionFilter());

  const fastifyCookieModule = await import("@fastify/cookie");
  await app.register(
    fastifyCookieModule.default as unknown as Parameters<
      typeof app.register
    >[0],
  );

  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

describe("Auth & Security Integration Tests", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const ts = Date.now();
  const testEmail = `test-${ts}@botolahub.test`;
  let activeAccessToken = "";
  let activeRefreshToken = "";

  beforeAll(async () => {
    app = await buildApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.client.user
        .deleteMany({ where: { email: { endsWith: "@botolahub.test" } } })
        .catch(() => null);
    }
    if (app) {
      await app.close();
    }
  });

  async function inject(
    method: string,
    url: string,
    payload?: object,
    headers?: Record<string, string>,
    cookies?: Record<string, string>,
  ) {
    const finalHeaders = payload
      ? { "content-type": "application/json", ...headers }
      : headers;
    const res = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: method as "GET" | "POST",
        url,
        headers: finalHeaders,
        cookies,
        payload: payload ? JSON.stringify(payload) : undefined,
      });
    return res;
  }

  describe("1. Registration", () => {
    it("registers a new user successfully", async () => {
      const res = await inject("POST", "/api/v1/auth/register", {
        email: testEmail,
        displayName: "Test User",
        password: "Password123!",
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe(testEmail);
    });

    it("rejects duplicate email with 409 Conflict", async () => {
      const res = await inject("POST", "/api/v1/auth/register", {
        email: testEmail,
        displayName: "Duplicate",
        password: "Password123!",
      });
      expect(res.statusCode).toBe(409);
    });

    it("rejects invalid email formatting with 400", async () => {
      const res = await inject("POST", "/api/v1/auth/register", {
        email: "not-an-email",
        displayName: "Bad Email",
        password: "Password123!",
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe("2. Login & Token Issuance", () => {
    it("logs in with valid credentials and issues tokens", async () => {
      const res = await inject("POST", "/api/v1/auth/login", {
        email: testEmail,
        password: "Password123!",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.refreshToken).toBeDefined();
      expect(body.data.refreshToken).toContain(".");

      activeAccessToken = body.data.accessToken;
      activeRefreshToken = body.data.refreshToken;
    });

    it("rejects invalid password with generic 401 message", async () => {
      const res = await inject("POST", "/api/v1/auth/login", {
        email: testEmail,
        password: "WrongPassword123!",
      });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.error.message).toMatch(/Invalid credentials/i);
    });

    it("rejects nonexistent user email with generic 401 message", async () => {
      const res = await inject("POST", "/api/v1/auth/login", {
        email: "nobody@botolahub.test",
        password: "Password123!",
      });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.error.message).toMatch(/Invalid credentials/i);
    });
  });

  describe("3. Access Token & Protected Endpoints", () => {
    it("allows access to GET /api/v1/auth/me with valid Bearer token", async () => {
      const res = await inject("GET", "/api/v1/auth/me", undefined, {
        Authorization: `Bearer ${activeAccessToken}`,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.user.email).toBe(testEmail);
    });

    it("rejects request missing Authorization header with 401", async () => {
      const res = await inject("GET", "/api/v1/auth/me");
      expect(res.statusCode).toBe(401);
    });

    it("rejects malformed or expired access token with 401", async () => {
      const res = await inject("GET", "/api/v1/auth/me", undefined, {
        Authorization: "Bearer invalid.jwt.token",
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe("4. Refresh Token Rotation & Mobile/Web Flow", () => {
    let rotatedRefreshToken = "";

    it("rotates refresh token via mobile body parameter", async () => {
      const res = await inject("POST", "/api/v1/auth/refresh", {
        refreshToken: activeRefreshToken,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.refreshToken).toBeDefined();
      expect(body.data.refreshToken).not.toBe(activeRefreshToken);

      rotatedRefreshToken = body.data.refreshToken;
    });

    it("rotates refresh token via Web HTTP-only cookie", async () => {
      const res = await inject(
        "POST",
        "/api/v1/auth/refresh",
        undefined,
        undefined,
        { botolahub_refresh: rotatedRefreshToken },
      );
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.refreshToken).toBeDefined();

      activeRefreshToken = body.data.refreshToken;
      activeAccessToken = body.data.accessToken;
    });

    it("rejects previous (old) refresh token after rotation", async () => {
      const res = await inject("POST", "/api/v1/auth/refresh", {
        refreshToken: rotatedRefreshToken,
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe("5. Security: Token Reuse Detection & Family Revocation", () => {
    it("detects refresh token reuse and revokes entire session family", async () => {
      const userRes = await inject("POST", "/api/v1/auth/login", {
        email: testEmail,
        password: "Password123!",
      });
      const loginBody = JSON.parse(userRes.body);
      const originalToken = loginBody.data.refreshToken;

      // First refresh succeeds and rotates token
      const refreshRes = await inject("POST", "/api/v1/auth/refresh", {
        refreshToken: originalToken,
      });
      expect(refreshRes.statusCode).toBe(200);
      const newRefreshToken = JSON.parse(refreshRes.body).data.refreshToken;

      // REUSE ATTACK: Re-sending original (now revoked) refresh token
      const reuseRes = await inject("POST", "/api/v1/auth/refresh", {
        refreshToken: originalToken,
      });
      expect(reuseRes.statusCode).toBe(401);

      // Verify that the new rotated token was ALSO revoked due to family revocation!
      const failedChildRefresh = await inject("POST", "/api/v1/auth/refresh", {
        refreshToken: newRefreshToken,
      });
      expect(failedChildRefresh.statusCode).toBe(401);
    });
  });

  describe("6. Session Revocation on Logout", () => {
    it("revokes session on logout and rejects access token afterwards", async () => {
      const loginRes = await inject("POST", "/api/v1/auth/login", {
        email: testEmail,
        password: "Password123!",
      });
      const loginBody = JSON.parse(loginRes.body);
      const sessionToken = loginBody.data.accessToken;
      const refreshTok = loginBody.data.refreshToken;

      // Verify token works before logout
      const beforeLogout = await inject("GET", "/api/v1/auth/me", undefined, {
        Authorization: `Bearer ${sessionToken}`,
      });
      expect(beforeLogout.statusCode).toBe(200);

      // Call logout
      const logoutRes = await inject(
        "POST",
        "/api/v1/auth/logout",
        { refreshToken: refreshTok },
        { Authorization: `Bearer ${sessionToken}` },
      );
      expect(logoutRes.statusCode).toBe(200);

      // Verify access token is NOW REJECTED because session in DB was marked isRevoked = true
      const afterLogout = await inject("GET", "/api/v1/auth/me", undefined, {
        Authorization: `Bearer ${sessionToken}`,
      });
      expect(afterLogout.statusCode).toBe(401);
    });
  });
});
