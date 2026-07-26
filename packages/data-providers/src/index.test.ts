import { describe, it, expect } from "vitest";
import {
  MockFootballDataProvider,
  ApiFootballProvider,
  getFootballDataProvider,
  ExternalClubSchema,
  ExternalPlayerSchema,
  ExternalFixtureSchema,
  ExternalMatchEventSchema,
  ExternalPlayerMatchStatsSchema,
} from "./index";

describe("packages/data-providers", () => {
  describe("MockFootballDataProvider", () => {
    const provider = new MockFootballDataProvider();

    it("returns correct provider name", () => {
      expect(provider.getProviderName()).toBe("mock");
    });

    it("fetches normalized competitions and seasons", async () => {
      const comps = await provider.fetchCompetitions();
      expect(comps.length).toBeGreaterThan(0);
      expect(comps[0].country).toBe("Morocco");

      const seasons = await provider.fetchSeasons();
      expect(seasons.length).toBeGreaterThan(0);
      expect(seasons[0].isActive).toBe(true);
    });

    it("fetches normalized clubs and players matching Zod schemas", async () => {
      const clubs = await provider.fetchClubs();
      expect(clubs.length).toBe(4);
      clubs.forEach((c) =>
        expect(() => ExternalClubSchema.parse(c)).not.toThrow(),
      );

      const players = await provider.fetchPlayers();
      expect(players.length).toBeGreaterThan(0);
      players.forEach((p) =>
        expect(() => ExternalPlayerSchema.parse(p)).not.toThrow(),
      );
    });

    it("fetches gameweeks and fixtures for gameweek 1", async () => {
      const gws = await provider.fetchGameweeks();
      expect(gws.length).toBe(30);

      const fixtures = await provider.fetchFixtures(1);
      expect(fixtures.length).toBeGreaterThan(0);
      fixtures.forEach((f) =>
        expect(() => ExternalFixtureSchema.parse(f)).not.toThrow(),
      );
    });

    it("fetches match events and player statistics", async () => {
      const events = await provider.fetchMatchEvents("mock-fixture-gw1-1");
      expect(events.length).toBeGreaterThan(0);
      events.forEach((e) =>
        expect(() => ExternalMatchEventSchema.parse(e)).not.toThrow(),
      );

      const stats =
        await provider.fetchPlayerFixtureStats("mock-fixture-gw1-1");
      expect(stats.length).toBeGreaterThan(0);
      stats.forEach((s) =>
        expect(() => ExternalPlayerMatchStatsSchema.parse(s)).not.toThrow(),
      );
    });
  });

  describe("ApiFootballProvider Scaffolding", () => {
    it("throws a clear error when API_FOOTBALL_KEY is missing", () => {
      const origKey = process.env.API_FOOTBALL_KEY;
      delete process.env.API_FOOTBALL_KEY;
      expect(() => new ApiFootballProvider()).toThrow(
        "ApiFootballProvider error: API_FOOTBALL_KEY credential is missing",
      );
      if (origKey) process.env.API_FOOTBALL_KEY = origKey;
    });

    it("instantiates cleanly when apiKey is provided", () => {
      const api = new ApiFootballProvider({ apiKey: "dummy_test_key" });
      expect(api.getProviderName()).toBe("apifootball");
    });
  });

  describe("getFootballDataProvider Factory", () => {
    it("returns MockFootballDataProvider by default", () => {
      const p = getFootballDataProvider();
      expect(p.getProviderName()).toBe("mock");
    });
  });
});
