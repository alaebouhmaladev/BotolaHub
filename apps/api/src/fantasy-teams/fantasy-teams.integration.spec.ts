import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "../app.module.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { GlobalExceptionFilter } from "../common/filters/global-exception.filter.js";
import { JwtService } from "@nestjs/jwt";

async function buildApp() {
  const moduleRef: TestingModule = await Test.createTestingModule({
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
  return { app, moduleRef };
}

describe("Fantasy Teams API (Integration)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let jwt: JwtService;

  let tokenUserA: string;
  let tokenUserB: string;
  let userAId: string;
  let userBId: string;
  let activeSeasonId: string;

  beforeAll(async () => {
    const res = await buildApp();
    app = res.app;
    prisma = res.moduleRef.get(PrismaService);
    jwt = res.moduleRef.get(JwtService);

    // Clean test users if existing
    const existingUsers = await prisma.client.user.findMany({
      where: {
        email: {
          in: ["integration_ft_a@test.com", "integration_ft_b@test.com"],
        },
      },
    });
    if (existingUsers.length > 0) {
      const uIds = existingUsers.map((u) => u.id);
      await prisma.client.fantasyTeam.deleteMany({
        where: { userId: { in: uIds } },
      });
      await prisma.client.user.deleteMany({
        where: { id: { in: uIds } },
      });
    }

    const season = await prisma.client.season.findFirst({
      where: { isActive: true },
    });
    activeSeasonId = season!.id;

    // Create Test User A
    const userA = await prisma.client.user.create({
      data: {
        email: "integration_ft_a@test.com",
        displayName: "User A",
        passwordHash: "hash_a",
      },
    });
    userAId = userA.id;

    const sessionA = await prisma.client.userSession.create({
      data: {
        userId: userA.id,
        refreshTokenHash: "hash_session_a",
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    tokenUserA = jwt.sign(
      { sub: userA.id, sessionId: sessionA.id, role: "USER" },
      {
        secret:
          process.env.JWT_SECRET || "botolahub_dev_jwt_secret_32chars_min!!",
      },
    );

    // Create Test User B
    const userB = await prisma.client.user.create({
      data: {
        email: "integration_ft_b@test.com",
        displayName: "User B",
        passwordHash: "hash_b",
      },
    });
    userBId = userB.id;

    const sessionB = await prisma.client.userSession.create({
      data: {
        userId: userB.id,
        refreshTokenHash: "hash_session_b",
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    tokenUserB = jwt.sign(
      { sub: userB.id, sessionId: sessionB.id, role: "USER" },
      {
        secret:
          process.env.JWT_SECRET || "botolahub_dev_jwt_secret_32chars_min!!",
      },
    );
  });

  afterAll(async () => {
    if (userAId || userBId) {
      await prisma.client.fantasyTeam.deleteMany({
        where: {
          userId: { in: [userAId, userBId].filter(Boolean) },
        },
      });
      await prisma.client.user.deleteMany({
        where: {
          id: { in: [userAId, userBId].filter(Boolean) },
        },
      });
    }
    await app.close();
  });

  describe("Fantasy Team Creation & Authorization", () => {
    it("rejects unauthenticated creation request with 401", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/fantasy-teams",
        payload: { name: "Unauthorized FC" },
      });
      expect(res.statusCode).toBe(401);
    });

    it("creates a new fantasy team for authenticated User A", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/fantasy-teams",
        headers: { authorization: `Bearer ${tokenUserA}` },
        payload: { name: "Atlas Lions FC" },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.data.name).toBe("Atlas Lions FC");
      expect(body.data.userId).toBe(userAId);
      expect(body.data.budgetPoints).toBe(1000);
    });

    it("rejects creating a duplicate fantasy team for User A in the same season with 400", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/fantasy-teams",
        headers: { authorization: `Bearer ${tokenUserA}` },
        payload: { name: "Second Lions FC" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("fetches current user team via /fantasy-teams/me", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/fantasy-teams/me",
        headers: { authorization: `Bearer ${tokenUserA}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.name).toBe("Atlas Lions FC");
    });
  });

  describe("Squad Management & Validation Security", () => {
    let teamAId: string;

    beforeAll(async () => {
      const team = await prisma.client.fantasyTeam.findFirst({
        where: { userId: userAId },
      });
      teamAId = team!.id;
    });

    it("rejects User B attempting to update User A's squad with 403", async () => {
      const dummyPlayers = await prisma.client.playerSeason.findMany({
        take: 15,
      });
      const dummyIds = dummyPlayers.map((p) => p.id);

      const res = await app.inject({
        method: "PUT",
        url: `/api/v1/fantasy-teams/${teamAId}/squad`,
        headers: { authorization: `Bearer ${tokenUserB}` },
        payload: { squadPlayerIds: dummyIds },
      });
      expect(res.statusCode).toBe(403);
    });

    it("rejects squad with invalid player count (not 15)", async () => {
      const res = await app.inject({
        method: "PUT",
        url: `/api/v1/fantasy-teams/${teamAId}/squad`,
        headers: { authorization: `Bearer ${tokenUserA}` },
        payload: { squadPlayerIds: ["p1", "p2"] },
      });
      expect(res.statusCode).toBe(400);
    });

    it("validates and saves a legal 15-player squad", async () => {
      const dbPlayers = await prisma.client.playerSeason.findMany({
        where: { seasonId: activeSeasonId },
        include: { player: true },
        orderBy: { pricePoints: "asc" },
      });

      const gks: string[] = [];
      const defs: string[] = [];
      const mids: string[] = [];
      const fwds: string[] = [];
      const clubCounts: Record<string, number> = {};

      for (const p of dbPlayers) {
        if ((clubCounts[p.clubId] || 0) >= 3) continue;

        if (p.player.position === "GK" && gks.length < 2) {
          gks.push(p.id);
          clubCounts[p.clubId] = (clubCounts[p.clubId] || 0) + 1;
        } else if (p.player.position === "DEF" && defs.length < 5) {
          defs.push(p.id);
          clubCounts[p.clubId] = (clubCounts[p.clubId] || 0) + 1;
        } else if (p.player.position === "MID" && mids.length < 5) {
          mids.push(p.id);
          clubCounts[p.clubId] = (clubCounts[p.clubId] || 0) + 1;
        } else if (p.player.position === "FWD" && fwds.length < 3) {
          fwds.push(p.id);
          clubCounts[p.clubId] = (clubCounts[p.clubId] || 0) + 1;
        }
      }

      const valid15Ids = [...gks, ...defs, ...mids, ...fwds];
      expect(valid15Ids).toHaveLength(15);

      const res = await app.inject({
        method: "PUT",
        url: `/api/v1/fantasy-teams/${teamAId}/squad`,
        headers: { authorization: `Bearer ${tokenUserA}` },
        payload: { squadPlayerIds: valid15Ids },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.squadMembers).toHaveLength(15);
    });

    it("rejects squad exceeding budget limit with 422 Unprocessable Entity", async () => {
      const expensivePlayers = await prisma.client.playerSeason.findMany({
        where: { seasonId: activeSeasonId },
        include: { player: true },
        orderBy: { pricePoints: "desc" },
      });

      const gks: string[] = [];
      const defs: string[] = [];
      const mids: string[] = [];
      const fwds: string[] = [];
      const clubCounts: Record<string, number> = {};

      for (const p of expensivePlayers) {
        if ((clubCounts[p.clubId] || 0) >= 3) continue;

        if (p.player.position === "GK" && gks.length < 2) {
          gks.push(p.id);
          clubCounts[p.clubId] = (clubCounts[p.clubId] || 0) + 1;
        } else if (p.player.position === "DEF" && defs.length < 5) {
          defs.push(p.id);
          clubCounts[p.clubId] = (clubCounts[p.clubId] || 0) + 1;
        } else if (p.player.position === "MID" && mids.length < 5) {
          mids.push(p.id);
          clubCounts[p.clubId] = (clubCounts[p.clubId] || 0) + 1;
        } else if (p.player.position === "FWD" && fwds.length < 3) {
          fwds.push(p.id);
          clubCounts[p.clubId] = (clubCounts[p.clubId] || 0) + 1;
        }
      }

      const expensive15Ids = [...gks, ...defs, ...mids, ...fwds];

      const res = await app.inject({
        method: "PUT",
        url: `/api/v1/fantasy-teams/${teamAId}/squad`,
        headers: { authorization: `Bearer ${tokenUserA}` },
        payload: { squadPlayerIds: expensive15Ids },
      });

      expect(res.statusCode).toBe(422);
      const body = JSON.parse(res.payload);
      expect(body.error.code).toBe("BUDGET_EXCEEDED");
    });
  });

  describe("Lineup Management & Formation Rules", () => {
    let teamAId: string;
    let starters: string[];
    let bench: string[];

    beforeAll(async () => {
      const team = await prisma.client.fantasyTeam.findFirst({
        where: { userId: userAId },
        include: {
          squadMembers: {
            include: {
              playerSeason: {
                include: { player: true },
              },
            },
          },
        },
      });
      teamAId = team!.id;

      // Group squad members by position
      const gks = team!.squadMembers.filter(
        (m) => m.playerSeason.player.position === "GK",
      );
      const defs = team!.squadMembers.filter(
        (m) => m.playerSeason.player.position === "DEF",
      );
      const mids = team!.squadMembers.filter(
        (m) => m.playerSeason.player.position === "MID",
      );
      const fwds = team!.squadMembers.filter(
        (m) => m.playerSeason.player.position === "FWD",
      );

      // Starters: 1 GK, 4 DEF, 4 MID, 2 FWD = 11 (Valid 4-4-2)
      const startingMembers = [
        gks[0],
        ...defs.slice(0, 4),
        ...mids.slice(0, 4),
        ...fwds.slice(0, 2),
      ];
      starters = startingMembers.map((m) => m.playerSeasonId);

      // Bench: 1 GK, 1 DEF, 1 MID, 1 FWD = 4
      const benchMembers = [gks[1], defs[4], mids[4], fwds[2]];
      bench = benchMembers.map((m) => m.playerSeasonId);
    });

    it("saves a valid starting 11 lineup and bench", async () => {
      const captain = starters[0];
      const viceCaptain = starters[1];

      const res = await app.inject({
        method: "PUT",
        url: `/api/v1/fantasy-teams/${teamAId}/lineup`,
        headers: { authorization: `Bearer ${tokenUserA}` },
        payload: {
          startingPlayerIds: starters,
          benchPlayerIds: bench,
          captainId: captain,
          viceCaptainId: viceCaptain,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.gameweekLineups).toHaveLength(1);
    });

    it("rejects captain equal to vice-captain with 422", async () => {
      const res = await app.inject({
        method: "PUT",
        url: `/api/v1/fantasy-teams/${teamAId}/lineup`,
        headers: { authorization: `Bearer ${tokenUserA}` },
        payload: {
          startingPlayerIds: starters,
          benchPlayerIds: bench,
          captainId: starters[0],
          viceCaptainId: starters[0],
        },
      });

      expect(res.statusCode).toBe(422);
      const body = JSON.parse(res.payload);
      expect(body.error.code).toBe("CAPTAIN_EQUALS_VICE_CAPTAIN");
    });
  });
});
