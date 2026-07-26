import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { AppModule } from "../app.module.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { IngestionService } from "./ingestion.service.js";

describe("Ingestion Pipeline & Idempotency (Integration)", () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let ingestionService: IngestionService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    ingestionService = moduleRef.get(IngestionService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it("runs competition sync idempotently without duplicating mappings", async () => {
    const res1 = await ingestionService.syncCompetitions();
    expect(res1.status).toBe("SUCCESS");

    const compCount1 = await prisma.client.competition.count();
    const mappingCount1 = await prisma.client.providerEntityMapping.count({
      where: { entityType: "competition" },
    });

    const res2 = await ingestionService.syncCompetitions();
    expect(res2.status).toBe("SUCCESS");

    const compCount2 = await prisma.client.competition.count();
    const mappingCount2 = await prisma.client.providerEntityMapping.count({
      where: { entityType: "competition" },
    });

    expect(compCount2).toBe(compCount1);
    expect(mappingCount2).toBe(mappingCount1);
    expect(res2.insertedCount).toBe(0);
    expect(res2.updatedCount).toBeGreaterThan(0);
  });

  it("runs mock gameweek ingestion twice with stable entity counts and clean audit records", async () => {
    const res1 = await ingestionService.ingestMockGameweek(1);
    expect(res1.status).toBe("SUCCESS");

    const fixStatsCount1 = await prisma.client.playerFixtureStats.count();

    const res2 = await ingestionService.ingestMockGameweek(1);
    expect(res2.status).toBe("SUCCESS");

    const fixStatsCount2 = await prisma.client.playerFixtureStats.count();

    expect(fixStatsCount2).toBe(fixStatsCount1);
    expect(res2.insertedCount).toBe(0);
    expect(res2.updatedCount).toBeGreaterThan(0);

    const auditRuns = await prisma.client.ingestionRun.findMany({
      where: { jobType: "mock_gameweek" },
      orderBy: { startedAt: "desc" },
    });
    expect(auditRuns.length).toBeGreaterThanOrEqual(2);
    expect(auditRuns[0].status).toBe("SUCCESS");
    expect(auditRuns[1].status).toBe("SUCCESS");
  });
});
