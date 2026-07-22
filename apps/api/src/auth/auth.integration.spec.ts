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
    fastifyCookieModule.default as unknown as Parameters<typeof app.register>[0],
  );

  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

describe("Auth Integration Tests", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const ts = Date.now();
  const testEmail = `test-${ts}@botolahub.test`;
  let accessToken = "";

  beforeAll(async () => {
    app = await buildApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.client.user
      .deleteMany({ where: { email: { endsWith: "@botolahub.test" } } })
      .catch(() => null);
    await app.close();
  });

  async function inject(method: string, url: string, payload?: object, headers?: Record<string, string>) {
    return app.getHttpAdapter().getInstance().inject({
      method: method as "GET" | "POST",
      url,
      headers: { "content-type": "application/json", ...headers },
      payload: payload ? JSON.stringify(payload) : undefined,
    });
  }

  describe("POST /api/v1/auth/register", () => {
    it("registers a new user", async () => {
      const res = await inject("POST", "/api/v1/auth/register", {
        email: testEmail,
        displayName: "Test User",
        password: "Password123!",
      });
      if (res.statusCode !== 201) console.error("register body:", res.body);
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body) as { success: boolean; data: { user: { email: string } } };
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe(testEmail);
    });

    it("rejects duplicate email with 409", async () => {
      const res = await inject("POST", "/api/v1/auth/register", {
        email: testEmail,
        displayName: "Dup",
        password: "Password123!",
      });
      expect(res.statusCode).toBe(409);
    });

    it("rejects invalid email with 400", async () => {
      const res = await inject("POST", "/api/v1/auth/register", {
        email: "notanemail",
        displayName: "Bad",
        password: "Password123!",
      });
      expect(res.statusCode).toBe(400);
    });

    it("rejects weak password with 400", async () => {
      const res = await inject("POST", "/api/v1/auth/register", {
        email: `weak-${ts}@botolahub.test`,
        displayName: "Weak",
        password: "short",
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("logs in with valid credentials", async () => {
      const res = await inject("POST", "/api/v1/auth/login", {
        email: testEmail,
        password: "Password123!",
      });
      if (res.statusCode !== 200) console.error("login body:", res.body);
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as { success: boolean; data: { accessToken: string } };
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeDefined();
      // Refresh token must NOT appear in JSON body
      expect(res.body).not.toMatch(/"refreshToken"/);
      accessToken = body.data.accessToken;
    });

    it("returns 401 with generic message for wrong password", async () => {
      const res = await inject("POST", "/api/v1/auth/login", {
        email: testEmail,
        password: "WrongPass123!",
      });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body) as { error: { message: string } };
      expect(body.error.message).toMatch(/Invalid credentials/i);
    });

    it("returns 401 with same generic message for nonexistent email", async () => {
      const res = await inject("POST", "/api/v1/auth/login", {
        email: "nobody@botolahub.test",
        password: "Password123!",
      });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body) as { error: { message: string } };
      expect(body.error.message).toMatch(/Invalid credentials/i);
    });
  });

  describe("GET /api/v1/auth/me", () => {
    it("returns current user with valid access token", async () => {
      const res = await inject("GET", "/api/v1/auth/me", undefined, {
        Authorization: `Bearer ${accessToken}`,
      });
      if (res.statusCode !== 200) console.error("me body:", res.body);
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as { data: { user: { email: string } } };
      expect(body.data.user.email).toBe(testEmail);
    });

    it("rejects request without token with 401", async () => {
      const res = await inject("GET", "/api/v1/auth/me");
      expect(res.statusCode).toBe(401);
    });

    it("rejects invalid token with 401", async () => {
      const res = await inject("GET", "/api/v1/auth/me", undefined, {
        Authorization: "Bearer invalid.token.here",
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe("POST /api/v1/auth/logout", () => {
    it("logout returns 200", async () => {
      const res = await inject("POST", "/api/v1/auth/logout");
      if (res.statusCode !== 200) console.error("logout body:", res.body);
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as { success: boolean };
      expect(body.success).toBe(true);
    });
  });
});
