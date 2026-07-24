import dotenv from "dotenv";
import path from "path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { NestFastifyApplication } from "@nestjs/platform-fastify";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { AppModule } from "../app.module.js";
import { GlobalExceptionFilter } from "../common/filters/global-exception.filter.js";
import { PrismaService } from "../prisma/prisma.service.js";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

async function buildApp() {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const adapter = new FastifyAdapter();
  const fastifyCookieModule = await import("@fastify/cookie");
  await adapter.register(
    fastifyCookieModule.default as unknown as Parameters<
      typeof adapter.register
    >[0],
  );

  const app = moduleRef.createNestApplication<NestFastifyApplication>(adapter);
  app.setGlobalPrefix("api/v1");
  app.useGlobalFilters(new GlobalExceptionFilter());

  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

describe("Auth & Security Integration Tests", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const ts = Date.now();
  const testEmail = `test-${ts}@botolahub.test`;
  const mobileEmail = `mobile-${ts}@botolahub.test`;

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
      if (res.statusCode !== 201) {
        throw new Error("REGISTER ERROR RES: " + res.body);
      }
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe(testEmail);

      // Register second user for mobile flow
      await inject("POST", "/api/v1/auth/register", {
        email: mobileEmail,
        displayName: "Mobile User",
        password: "Password123!",
      });
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

  describe("2. Web Authentication Flow (HTTP-Only Cookie Isolation)", () => {
    let webAccessToken = "";
    let webCookieValue = "";

    it("web login sets HTTP-only cookie and NEVER returns refreshToken in JSON body", async () => {
      const res = await inject("POST", "/api/v1/auth/login", {
        email: testEmail,
        password: "Password123!",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.user.email).toBe(testEmail);

      // CRITICAL: refreshToken MUST NOT appear in web response body!
      expect(body.data.refreshToken).toBeUndefined();
      expect(res.body).not.toMatch(/"refreshToken"/);

      // Assert Set-Cookie header contains botolahub_refresh
      const cookies = res.cookies as Array<{ name: string; value: string }>;
      const refreshCookie = cookies.find((c) => c.name === "botolahub_refresh");
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie!.value).toContain(".");

      // Secret must be high-entropy base64url (length >= 40)
      const secret = refreshCookie!.value.split(".")[1];
      expect(secret!.length).toBeGreaterThanOrEqual(40);

      webAccessToken = body.data.accessToken;
      webCookieValue = refreshCookie!.value;
    });

    it("web refresh rotates cookie and NEVER returns refreshToken in JSON body", async () => {
      const res = await inject(
        "POST",
        "/api/v1/auth/refresh",
        undefined,
        undefined,
        { botolahub_refresh: webCookieValue },
      );
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.accessToken).toBeDefined();

      // CRITICAL: refreshToken MUST NOT appear in web response body!
      expect(body.data.refreshToken).toBeUndefined();
      expect(res.body).not.toMatch(/"refreshToken"/);

      const cookies = res.cookies as Array<{ name: string; value: string }>;
      const newCookie = cookies.find((c) => c.name === "botolahub_refresh");
      expect(newCookie).toBeDefined();
      expect(newCookie!.value).not.toBe(webCookieValue);

      webCookieValue = newCookie!.value;
      webAccessToken = body.data.accessToken;
    });

    it("access to GET /api/v1/auth/me works with web access token", async () => {
      const res = await inject("GET", "/api/v1/auth/me", undefined, {
        Authorization: `Bearer ${webAccessToken}`,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.user.email).toBe(testEmail);
    });

    it("web logout clears cookie, revokes session, and is safe when repeated", async () => {
      const logoutRes = await inject(
        "POST",
        "/api/v1/auth/logout",
        undefined,
        undefined,
        { botolahub_refresh: webCookieValue },
      );
      expect(logoutRes.statusCode).toBe(200);

      // Access token is rejected after logout because session in DB was marked isRevoked = true
      const meRes = await inject("GET", "/api/v1/auth/me", undefined, {
        Authorization: `Bearer ${webAccessToken}`,
      });
      expect(meRes.statusCode).toBe(401);

      // Repeated web logout is safe and idempotent
      const repeatLogout = await inject(
        "POST",
        "/api/v1/auth/logout",
        undefined,
        undefined,
        { botolahub_refresh: webCookieValue },
      );
      expect(repeatLogout.statusCode).toBe(200);
    });
  });

  describe("3. Mobile Authentication Flow (Expo SecureStore Transport)", () => {
    let mobileRefreshToken = "";
    let mobileAccessToken = "";

    it("mobile login returns refreshToken in body for Expo SecureStore and sets NO web cookies", async () => {
      const res = await inject("POST", "/api/v1/auth/mobile/login", {
        email: mobileEmail,
        password: "Password123!",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.refreshToken).toBeDefined();
      expect(body.data.refreshToken).toContain(".");

      // High-entropy base64url secret check
      const secret = body.data.refreshToken.split(".")[1];
      expect(secret.length).toBeGreaterThanOrEqual(40);

      // Web cookies must NOT be set on mobile login
      const cookies = res.cookies as Array<{ name: string }>;
      const refreshCookie = cookies?.find(
        (c) => c.name === "botolahub_refresh",
      );
      expect(refreshCookie).toBeUndefined();

      mobileRefreshToken = body.data.refreshToken;
      mobileAccessToken = body.data.accessToken;
    });

    it("mobile refresh rotates token in body", async () => {
      const res = await inject("POST", "/api/v1/auth/mobile/refresh", {
        refreshToken: mobileRefreshToken,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.refreshToken).toBeDefined();
      expect(body.data.refreshToken).not.toBe(mobileRefreshToken);

      mobileRefreshToken = body.data.refreshToken;
      mobileAccessToken = body.data.accessToken;
    });

    it("mobile logout revokes session via token body and is safe when repeated", async () => {
      const logoutRes = await inject("POST", "/api/v1/auth/mobile/logout", {
        refreshToken: mobileRefreshToken,
      });
      expect(logoutRes.statusCode).toBe(200);

      // Access token rejected after logout
      const meRes = await inject("GET", "/api/v1/auth/me", undefined, {
        Authorization: `Bearer ${mobileAccessToken}`,
      });
      expect(meRes.statusCode).toBe(401);

      // Repeated mobile logout is safe and idempotent
      const repeatLogout = await inject("POST", "/api/v1/auth/mobile/logout", {
        refreshToken: mobileRefreshToken,
      });
      expect(repeatLogout.statusCode).toBe(200);
    });
  });

  describe("4. Security: Secret Hash Verification on Logout", () => {
    it("rejects logout with guessed session UUID and invalid secret without revoking session", async () => {
      const loginRes = await inject("POST", "/api/v1/auth/mobile/login", {
        email: mobileEmail,
        password: "Password123!",
      });
      const validRefreshToken = JSON.parse(loginRes.body).data.refreshToken;
      const [sessionId] = validRefreshToken.split(".");

      // Attempt to revoke using guessed/real sessionId with a FAKE secret
      const fakeToken = `${sessionId}.fakeSecret1234567890abcdefghijklmnopqrstuvwxyz`;
      const attackRes = await inject("POST", "/api/v1/auth/mobile/logout", {
        refreshToken: fakeToken,
      });
      expect(attackRes.statusCode).toBe(401);

      // Verify the legitimate session in DB WAS NOT REVOKED!
      const sessionInDb = await prisma.client.userSession.findUnique({
        where: { id: sessionId },
      });
      expect(sessionInDb?.isRevoked).toBe(false);

      // Legitimate refresh still works cleanly
      const legitRefresh = await inject("POST", "/api/v1/auth/mobile/refresh", {
        refreshToken: validRefreshToken,
      });
      expect(legitRefresh.statusCode).toBe(200);
    });
  });

  describe("5. Security: Verified Token Reuse Detection Sequence", () => {
    it("invalid secret for a real revoked session ID does NOT revoke the legitimate active token family", async () => {
      // 1. Initial login
      const loginRes = await inject("POST", "/api/v1/auth/mobile/login", {
        email: mobileEmail,
        password: "Password123!",
      });
      const token1 = JSON.parse(loginRes.body).data.refreshToken;
      const [session1Id] = token1.split(".");

      // 2. Legitimate refresh -> token1 becomes revoked (isRevoked = true), token2 is active
      const refreshRes = await inject("POST", "/api/v1/auth/mobile/refresh", {
        refreshToken: token1,
      });
      expect(refreshRes.statusCode).toBe(200);
      const token2 = JSON.parse(refreshRes.body).data.refreshToken;

      // 3. ATTACK: Present real revoked session ID with a FAKE secret
      const fakeSecretAttackToken = `${session1Id}.invalidFakeSecret999999`;
      const attackRes = await inject("POST", "/api/v1/auth/mobile/refresh", {
        refreshToken: fakeSecretAttackToken,
      });
      expect(attackRes.statusCode).toBe(401);

      // 4. CRITICAL VERIFICATION: Legitimate active token2 family MUST NOT BE REVOKED!
      const legitActiveRefresh = await inject(
        "POST",
        "/api/v1/auth/mobile/refresh",
        { refreshToken: token2 },
      );
      expect(legitActiveRefresh.statusCode).toBe(200);
      const token3 = JSON.parse(legitActiveRefresh.body).data.refreshToken;
      expect(token3).toBeDefined();
    });

    it("confirmed token reuse attack (valid secret + revoked session) DOES revoke the active family", async () => {
      // 1. Login
      const loginRes = await inject("POST", "/api/v1/auth/mobile/login", {
        email: mobileEmail,
        password: "Password123!",
      });
      const token1 = JSON.parse(loginRes.body).data.refreshToken;

      // 2. Legitimate refresh -> token1 is revoked, token2 is active
      const refreshRes = await inject("POST", "/api/v1/auth/mobile/refresh", {
        refreshToken: token1,
      });
      expect(refreshRes.statusCode).toBe(200);
      const token2 = JSON.parse(refreshRes.body).data.refreshToken;

      // 3. CONFIRMED REUSE ATTACK: Re-present token1 with VALID secret
      const reuseAttackRes = await inject(
        "POST",
        "/api/v1/auth/mobile/refresh",
        {
          refreshToken: token1,
        },
      );
      expect(reuseAttackRes.statusCode).toBe(401);
      const body = JSON.parse(reuseAttackRes.body);
      expect(body.error.message).toMatch(/reuse detected/i);

      // 4. Active token2 MUST NOW BE REVOKED due to family revocation!
      const childRefreshRes = await inject(
        "POST",
        "/api/v1/auth/mobile/refresh",
        { refreshToken: token2 },
      );
      expect(childRefreshRes.statusCode).toBe(401);
    });
  });
});
