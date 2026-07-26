import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { AppModule } from "../app.module.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { IngestionService } from "../ingestion/ingestion.service.js";
import { ScoringService } from "./scoring.service.js";

describe("Scoring Engine & Idempotency (Integration)", () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let ingestionService: IngestionService;
  let scoringService: ScoringService;
  let gameweek1Id: string;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    ingestionService = moduleRef.get(IngestionService);
    scoringService = moduleRef.get(ScoringService);

    const activeSeason = await prisma.client.season.findFirst({
      where: { isActive: true },
    });
    const gw = await prisma.client.gameweek.findFirst({
      where: { seasonId: activeSeason!.id, number: 1 },
    });
    gameweek1Id = gw!.id;

    // Ingest mock gameweek stats
    await ingestionService.ingestMockGameweek(1);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it("scores gameweek once and creates player and team scores", async () => {
    const res1 = await scoringService.scoreGameweek(gameweek1Id);
    expect(res1.status).toBe("SUCCESS");
    expect(res1.playerScoresCalculated).toBeGreaterThan(0);

    const scoreCount1 = await prisma.client.fantasyPlayerScore.count({
      where: { gameweekId: gameweek1Id },
    });
    expect(scoreCount1).toBe(res1.playerScoresCalculated);
  });

  it("scores gameweek twice without duplicating score rows or drifting totals", async () => {
    const scoreCountBefore = await prisma.client.fantasyPlayerScore.count({
      where: { gameweekId: gameweek1Id },
    });
    const scoresBefore = await prisma.client.fantasyPlayerScore.findMany({
      where: { gameweekId: gameweek1Id },
      orderBy: { playerSeasonId: "asc" },
    });

    const res2 = await scoringService.scoreGameweek(gameweek1Id);
    expect(res2.status).toBe("SUCCESS");

    const scoreCountAfter = await prisma.client.fantasyPlayerScore.count({
      where: { gameweekId: gameweek1Id },
    });
    const scoresAfter = await prisma.client.fantasyPlayerScore.findMany({
      where: { gameweekId: gameweek1Id },
      orderBy: { playerSeasonId: "asc" },
    });

    expect(scoreCountAfter).toBe(scoreCountBefore);
    for (let i = 0; i < scoresBefore.length; i++) {
      expect(scoresAfter[i].points).toBe(scoresBefore[i].points);
    }
  });

  it("safely recalculates player scores when statistics are modified", async () => {
    const firstStat = await prisma.client.playerFixtureStats.findFirst({
      where: {
        fixture: { gameweekId: gameweek1Id },
      },
    });

    const initialScore = await prisma.client.fantasyPlayerScore.findUnique({
      where: {
        playerSeasonId_gameweekId: {
          playerSeasonId: firstStat!.playerSeasonId,
          gameweekId: gameweek1Id,
        },
      },
    });

    // Update goal count by +1
    await prisma.client.playerFixtureStats.update({
      where: { id: firstStat!.id },
      data: { goals: firstStat!.goals + 1 },
    });

    // Rescore
    await scoringService.scoreGameweek(gameweek1Id);

    const updatedScore = await prisma.client.fantasyPlayerScore.findUnique({
      where: {
        playerSeasonId_gameweekId: {
          playerSeasonId: firstStat!.playerSeasonId,
          gameweekId: gameweek1Id,
        },
      },
    });

    expect(updatedScore!.points).toBeGreaterThan(initialScore!.points);
  });
});
