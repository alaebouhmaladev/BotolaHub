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

describe("Transfers API (Integration)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let jwt: JwtService;

  let tokenUserA: string;
  let tokenUserB: string;
  let userAId: string;
  let userBId: string;
  let teamAId: string;
  let activeGameweekId: string;

  let squadMemberOut: string;
  let unownedPlayerIn: string;

  beforeAll(async () => {
    const res = await buildApp();
    app = res.app;
    prisma = res.moduleRef.get(PrismaService);
    jwt = res.moduleRef.get(JwtService);

    // Cleanup existing integration users
    const existing = await prisma.client.user.findMany({
      where: { email: { in: ["tr_test_a@test.com", "tr_test_b@test.com"] } },
    });
    if (existing.length > 0) {
      const uIds = existing.map((u) => u.id);
      await prisma.client.transfer.deleteMany({
        where: { fantasyTeam: { userId: { in: uIds } } },
      });
      await prisma.client.fantasyTeamGameweekScore.deleteMany({
        where: { fantasyTeam: { userId: { in: uIds } } },
      });
      await prisma.client.gameweekLineupPlayer.deleteMany({
        where: { lineup: { fantasyTeam: { userId: { in: uIds } } } },
      });
      await prisma.client.gameweekLineup.deleteMany({
        where: { fantasyTeam: { userId: { in: uIds } } },
      });
      await prisma.client.fantasySquadMember.deleteMany({
        where: { fantasyTeam: { userId: { in: uIds } } },
      });
      await prisma.client.fantasyTeam.deleteMany({
        where: { userId: { in: uIds } },
      });
      await prisma.client.user.deleteMany({ where: { id: { in: uIds } } });
    }

    const activeSeason = await prisma.client.season.findFirst({
      where: { isActive: true },
    });
    const gw = await prisma.client.gameweek.findFirst({
      where: { seasonId: activeSeason!.id },
      orderBy: { number: "asc" },
    });
    activeGameweekId = gw!.id;

    // Reset deadline into future for test
    await prisma.client.gameweek.update({
      where: { id: activeGameweekId },
      data: { deadlineUtc: new Date(Date.now() + 86400000) },
    });

    // Create User A & Team A
    const userA = await prisma.client.user.create({
      data: {
        email: "tr_test_a@test.com",
        displayName: "Tr User A",
        passwordHash: "hash_tr_a",
      },
    });
    userAId = userA.id;

    const sessionA = await prisma.client.userSession.create({
      data: {
        userId: userA.id,
        refreshTokenHash: "hash_tr_sess_a",
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

    // Create User B & Team B
    const userB = await prisma.client.user.create({
      data: {
        email: "tr_test_b@test.com",
        displayName: "Tr User B",
        passwordHash: "hash_tr_b",
      },
    });
    userBId = userB.id;

    const sessionB = await prisma.client.userSession.create({
      data: {
        userId: userB.id,
        refreshTokenHash: "hash_tr_sess_b",
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

    // Create Fantasy Team for User A with legal 15-player squad
    const team = await prisma.client.fantasyTeam.create({
      data: {
        userId: userA.id,
        seasonId: activeSeason!.id,
        name: "Transfers FC",
        budgetPoints: 1000,
      },
    });
    teamAId = team.id;

    // Pick valid 15 players for squad (2 GK, 5 DEF, 5 MID, 3 FWD)
    const dbPlayers = await prisma.client.playerSeason.findMany({
      where: { seasonId: activeSeason!.id },
      include: { player: true },
      orderBy: { pricePoints: "asc" },
    });

    const gks: typeof dbPlayers = [];
    const defs: typeof dbPlayers = [];
    const mids: typeof dbPlayers = [];
    const fwds: typeof dbPlayers = [];
    const clubCounts: Record<string, number> = {};

    for (const p of dbPlayers) {
      if ((clubCounts[p.clubId] || 0) >= 3) continue;

      if (p.player.position === "GK" && gks.length < 3) {
        gks.push(p);
        if (gks.length <= 2)
          clubCounts[p.clubId] = (clubCounts[p.clubId] || 0) + 1;
      } else if (p.player.position === "DEF" && defs.length < 6) {
        defs.push(p);
        if (defs.length <= 5)
          clubCounts[p.clubId] = (clubCounts[p.clubId] || 0) + 1;
      } else if (p.player.position === "MID" && mids.length < 6) {
        mids.push(p);
        if (mids.length <= 5)
          clubCounts[p.clubId] = (clubCounts[p.clubId] || 0) + 1;
      } else if (p.player.position === "FWD" && fwds.length < 4) {
        fwds.push(p);
        if (fwds.length <= 3)
          clubCounts[p.clubId] = (clubCounts[p.clubId] || 0) + 1;
      }
    }

    const squad15 = [
      ...gks.slice(0, 2),
      ...defs.slice(0, 5),
      ...mids.slice(0, 5),
      ...fwds.slice(0, 3),
    ];
    for (const p of squad15) {
      await prisma.client.fantasySquadMember.create({
        data: {
          fantasyTeamId: team.id,
          playerSeasonId: p.id,
          purchasePrice: p.pricePoints,
        },
      });
    }

    squadMemberOut = squad15[2].id; // First DEF in squad15
    const squadClubIds = squad15.map((p) => p.clubId);

    // Pick a DEF not in squad15 whose club count in squad15 is < 3
    const validInDef = dbPlayers.find(
      (p) =>
        p.player.position === "DEF" &&
        !squad15.some((s) => s.id === p.id) &&
        squadClubIds.filter((cid) => cid === p.clubId).length < 3,
    );

    unownedPlayerIn = validInDef!.id;
  });

  afterAll(async () => {
    if (userAId || userBId) {
      const uIds = [userAId, userBId].filter(Boolean);
      await prisma.client.transfer.deleteMany({
        where: { fantasyTeam: { userId: { in: uIds } } },
      });
      await prisma.client.fantasyTeamGameweekScore.deleteMany({
        where: { fantasyTeam: { userId: { in: uIds } } },
      });
      await prisma.client.gameweekLineupPlayer.deleteMany({
        where: { lineup: { fantasyTeam: { userId: { in: uIds } } } },
      });
      await prisma.client.gameweekLineup.deleteMany({
        where: { fantasyTeam: { userId: { in: uIds } } },
      });
      await prisma.client.fantasySquadMember.deleteMany({
        where: { fantasyTeam: { userId: { in: uIds } } },
      });
      await prisma.client.fantasyTeam.deleteMany({
        where: { userId: { in: uIds } },
      });
      await prisma.client.user.deleteMany({
        where: { id: { in: uIds } },
      });
    }
    await app.close();
  });

  describe("Transfer Preview & Confirmation", () => {
    it("returns transfer preview result without mutating data", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/transfers/preview",
        headers: { authorization: `Bearer ${tokenUserA}` },
        payload: {
          transfers: [
            {
              outgoingPlayerSeasonId: squadMemberOut,
              incomingPlayerSeasonId: unownedPlayerIn,
            },
          ],
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.data.transfersCount).toBe(1);
      expect(body.data.deductionPoints).toBe(0); // 1 free transfer available

      // Verify no squad mutation
      const squad = await prisma.client.fantasySquadMember.findMany({
        where: { fantasyTeamId: teamAId },
      });
      expect(squad.map((s) => s.playerSeasonId)).toContain(squadMemberOut);
      expect(squad.map((s) => s.playerSeasonId)).not.toContain(unownedPlayerIn);
    });

    it("rejects transfer preview if outgoing player is not owned", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/transfers/preview",
        headers: { authorization: `Bearer ${tokenUserA}` },
        payload: {
          transfers: [
            {
              outgoingPlayerSeasonId: "not-in-squad-id",
              incomingPlayerSeasonId: unownedPlayerIn,
            },
          ],
        },
      });
      expect(res.statusCode).toBe(400);
    });

    it("confirms a valid free transfer atomically", async () => {
      const idempotencyKey = `tr-test-key-${Date.now()}`;

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/transfers/confirm",
        headers: { authorization: `Bearer ${tokenUserA}` },
        payload: {
          transfers: [
            {
              outgoingPlayerSeasonId: squadMemberOut,
              incomingPlayerSeasonId: unownedPlayerIn,
            },
          ],
          idempotencyKey,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.data.success).toBe(true);
      expect(body.data.transferGroupKey).toBe(idempotencyKey);

      // Verify squad updated
      const updatedSquad = await prisma.client.fantasySquadMember.findMany({
        where: { fantasyTeamId: teamAId },
      });
      expect(updatedSquad.map((s) => s.playerSeasonId)).not.toContain(
        squadMemberOut,
      );
      expect(updatedSquad.map((s) => s.playerSeasonId)).toContain(
        unownedPlayerIn,
      );
    });

    it("returns identical result for duplicate confirm request (Idempotency Protection)", async () => {
      const idempotencyKey = "fixed-idempotency-key-123";

      const res1 = await app.inject({
        method: "POST",
        url: "/api/v1/transfers/confirm",
        headers: { authorization: `Bearer ${tokenUserA}` },
        payload: {
          transfers: [
            {
              outgoingPlayerSeasonId: unownedPlayerIn,
              incomingPlayerSeasonId: squadMemberOut,
            },
          ],
          idempotencyKey,
        },
      });
      expect(res1.statusCode).toBe(201);

      const res2 = await app.inject({
        method: "POST",
        url: "/api/v1/transfers/confirm",
        headers: { authorization: `Bearer ${tokenUserA}` },
        payload: {
          transfers: [
            {
              outgoingPlayerSeasonId: unownedPlayerIn,
              incomingPlayerSeasonId: squadMemberOut,
            },
          ],
          idempotencyKey,
        },
      });
      expect(res2.statusCode).toBe(201);
      const body2 = JSON.parse(res2.payload);
      expect(body2.data.transferGroupKey).toBe(idempotencyKey);
    });

    it("rejects transfer confirmation when deadline has passed", async () => {
      // Set deadline to past for all active gameweeks
      await prisma.client.gameweek.updateMany({
        where: { status: "ACTIVE" },
        data: { deadlineUtc: new Date(Date.now() - 3600000) },
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/transfers/confirm",
        headers: { authorization: `Bearer ${tokenUserA}` },
        payload: {
          transfers: [
            {
              outgoingPlayerSeasonId: squadMemberOut,
              incomingPlayerSeasonId: unownedPlayerIn,
            },
          ],
        },
      });

      expect(res.statusCode).toBe(400);

      // Restore deadline to future
      await prisma.client.gameweek.updateMany({
        where: { status: "ACTIVE" },
        data: { deadlineUtc: new Date(Date.now() + 86400000) },
      });
    });

    it("fetches transfer history via /api/v1/transfers/history", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/transfers/history",
        headers: { authorization: `Bearer ${tokenUserA}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
    });

    it("rejects User B attempting to perform transfers without team with 404", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/transfers/preview",
        headers: { authorization: `Bearer ${tokenUserB}` },
        payload: {
          transfers: [
            {
              outgoingPlayerSeasonId: squadMemberOut,
              incomingPlayerSeasonId: unownedPlayerIn,
            },
          ],
        },
      });
      expect(res.statusCode).toBe(404);
    });
  });
});
