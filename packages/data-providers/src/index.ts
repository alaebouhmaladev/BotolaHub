import { z } from "zod";

// ─── Enums & Constants ────────────────────────────────────────────────────────

export const FixtureStatusSchema = z.enum([
  "SCHEDULED",
  "LIVE",
  "POSTPONED",
  "CANCELLED",
  "FINISHED",
]);
export type FixtureStatus = z.infer<typeof FixtureStatusSchema>;

export const MatchEventTypeSchema = z.enum([
  "GOAL",
  "ASSIST",
  "YELLOW_CARD",
  "RED_CARD",
  "OWN_GOAL",
  "PENALTY_SAVED",
  "PENALTY_MISSED",
  "SUBSTITUTION",
]);
export type MatchEventType = z.infer<typeof MatchEventTypeSchema>;

export const PositionSchema = z.enum(["GK", "DEF", "MID", "FWD"]);
export type Position = z.infer<typeof PositionSchema>;

// ─── Zod Schemas for Provider Entities ────────────────────────────────────────

export const ExternalCompetitionSchema = z.object({
  providerId: z.string(),
  name: z.string(),
  nameAr: z.string().optional().default("البطولة الاحترافية"),
  nameFr: z.string().optional().default("Botola Pro"),
  country: z.string().default("Morocco"),
});
export type ExternalCompetition = z.infer<typeof ExternalCompetitionSchema>;

export const ExternalSeasonSchema = z.object({
  providerId: z.string(),
  competitionProviderId: z.string(),
  label: z.string(),
  isActive: z.boolean().default(true),
  startDate: z.string(),
  endDate: z.string(),
});
export type ExternalSeason = z.infer<typeof ExternalSeasonSchema>;

export const ExternalClubSchema = z.object({
  providerId: z.string(),
  name: z.string(),
  shortName: z.string(),
  code: z.string(),
  logoUrl: z.string().optional(),
});
export type ExternalClub = z.infer<typeof ExternalClubSchema>;

export const ExternalPlayerSchema = z.object({
  providerId: z.string(),
  clubProviderId: z.string(),
  name: z.string(),
  position: PositionSchema,
  priceTenths: z.number().int().min(40).max(150),
});
export type ExternalPlayer = z.infer<typeof ExternalPlayerSchema>;

export const ExternalPlayerSeasonSchema = z.object({
  providerId: z.string(),
  playerProviderId: z.string(),
  clubProviderId: z.string(),
  priceTenths: z.number().int(),
  status: z
    .enum(["AVAILABLE", "INJURED", "SUSPENDED", "UNKNOWN"])
    .default("AVAILABLE"),
});
export type ExternalPlayerSeason = z.infer<typeof ExternalPlayerSeasonSchema>;

export const ExternalGameweekSchema = z.object({
  providerId: z.string(),
  seasonProviderId: z.string().optional(),
  number: z.number().int().min(1).max(30),
  status: z
    .enum(["SCHEDULED", "ACTIVE", "FINISHED", "LOCKED"])
    .default("SCHEDULED"),
  deadlineUtc: z.string(),
  startDate: z.string(),
  endDate: z.string(),
});
export type ExternalGameweek = z.infer<typeof ExternalGameweekSchema>;

export const ExternalFixtureSchema = z.object({
  providerId: z.string(),
  homeClubProviderId: z.string(),
  awayClubProviderId: z.string(),
  gameweekNumber: z.number().int().min(1).max(30),
  kickoffTimeUtc: z.string(),
  status: FixtureStatusSchema,
  homeScore: z.number().int().min(0).optional(),
  awayScore: z.number().int().min(0).optional(),
  venue: z.string().optional(),
});
export type ExternalFixture = z.infer<typeof ExternalFixtureSchema>;

export const ExternalMatchEventSchema = z.object({
  id: z.string(),
  fixtureProviderId: z.string(),
  minute: z.number().int().min(0).max(120),
  type: MatchEventTypeSchema,
  playerProviderId: z.string().optional(),
  detail: z.string().optional(),
});
export type ExternalMatchEvent = z.infer<typeof ExternalMatchEventSchema>;

export const ExternalPlayerMatchStatsSchema = z.object({
  fixtureProviderId: z.string(),
  playerProviderId: z.string(),
  minutesPlayed: z.number().int().min(0).max(120).default(0),
  goals: z.number().int().min(0).default(0),
  assists: z.number().int().min(0).default(0),
  cleanSheet: z.boolean().default(false),
  yellowCards: z.number().int().min(0).max(2).default(0),
  redCards: z.number().int().min(0).max(1).default(0),
  saves: z.number().int().min(0).default(0),
  penaltySaves: z.number().int().min(0).default(0),
  penaltyMisses: z.number().int().min(0).default(0),
  ownGoals: z.number().int().min(0).default(0),
  goalsConceded: z.number().int().min(0).default(0),
});
export type ExternalPlayerMatchStats = z.infer<
  typeof ExternalPlayerMatchStatsSchema
>;

// ─── Football Data Provider Interface ─────────────────────────────────────────

export interface FootballDataProvider {
  getProviderName(): string;
  fetchCompetitions(): Promise<ExternalCompetition[]>;
  fetchSeasons(): Promise<ExternalSeason[]>;
  fetchClubs(): Promise<ExternalClub[]>;
  fetchPlayers(): Promise<ExternalPlayer[]>;
  fetchGameweeks(): Promise<ExternalGameweek[]>;
  fetchFixtures(gameweekNumber?: number): Promise<ExternalFixture[]>;
  fetchMatchEvents(fixtureProviderId: string): Promise<ExternalMatchEvent[]>;
  fetchPlayerFixtureStats(
    fixtureProviderId: string,
  ): Promise<ExternalPlayerMatchStats[]>;
}

// ─── Mock Data Provider Implementation ───────────────────────────────────────

export class MockFootballDataProvider implements FootballDataProvider {
  getProviderName(): string {
    return "mock";
  }

  async fetchCompetitions(): Promise<ExternalCompetition[]> {
    return [
      ExternalCompetitionSchema.parse({
        providerId: "mock-comp-botola-2026",
        name: "Botola Pro Inwi 1",
        nameAr: "البطولة الاحترافية إنوي 1",
        nameFr: "Botola Pro Inwi 1",
        country: "Morocco",
      }),
    ];
  }

  async fetchSeasons(): Promise<ExternalSeason[]> {
    return [
      ExternalSeasonSchema.parse({
        providerId: "mock-season-2026",
        competitionProviderId: "mock-comp-botola-2026",
        label: "2025-2026",
        isActive: true,
        startDate: "2025-09-01T00:00:00.000Z",
        endDate: "2026-06-30T23:59:59.000Z",
      }),
    ];
  }

  async fetchClubs(): Promise<ExternalClub[]> {
    const rawClubs = [
      {
        providerId: "mock-club-1",
        name: "Raja Club Athletic",
        shortName: "RCA",
        code: "RCA",
      },
      {
        providerId: "mock-club-2",
        name: "Wydad Athletic Club",
        shortName: "WAC",
        code: "WAC",
      },
      {
        providerId: "mock-club-3",
        name: "AS FAR Rabat",
        shortName: "FAR",
        code: "FAR",
      },
      {
        providerId: "mock-club-4",
        name: "RS Berkane",
        shortName: "RSB",
        code: "RSB",
      },
    ];
    return rawClubs.map((c) => ExternalClubSchema.parse(c));
  }

  async fetchPlayers(): Promise<ExternalPlayer[]> {
    const rawPlayers = [
      {
        providerId: "mock-player-1",
        clubProviderId: "mock-club-1",
        name: "Yassine Bounou (Mock)",
        position: "GK",
        priceTenths: 55,
      },
      {
        providerId: "mock-player-2",
        clubProviderId: "mock-club-1",
        name: "Achraf Hakimi (Mock)",
        position: "DEF",
        priceTenths: 70,
      },
      {
        providerId: "mock-player-3",
        clubProviderId: "mock-club-1",
        name: "Sufian Rahimi (Mock)",
        position: "FWD",
        priceTenths: 85,
      },
      {
        providerId: "mock-player-4",
        clubProviderId: "mock-club-2",
        name: "Yahya Jabrane (Mock)",
        position: "MID",
        priceTenths: 60,
      },
      {
        providerId: "mock-player-5",
        clubProviderId: "mock-club-2",
        name: "Ayoub El Kaabi (Mock)",
        position: "FWD",
        priceTenths: 80,
      },
      {
        providerId: "mock-player-6",
        clubProviderId: "mock-club-3",
        name: "Mohamed Chibi (Mock)",
        position: "DEF",
        priceTenths: 65,
      },
    ];
    return rawPlayers.map((p) => ExternalPlayerSchema.parse(p));
  }

  async fetchGameweeks(): Promise<ExternalGameweek[]> {
    return Array.from({ length: 30 }, (_, i) => {
      const gwNum = i + 1;
      const start = new Date(Date.UTC(2025, 8, 1 + i * 7, 18, 0, 0));
      const deadline = new Date(Date.UTC(2025, 8, 1 + i * 7, 17, 0, 0));
      const end = new Date(Date.UTC(2025, 8, 3 + i * 7, 22, 0, 0));
      return ExternalGameweekSchema.parse({
        providerId: `mock-gw-${gwNum}`,
        seasonProviderId: "mock-season-2026",
        number: gwNum,
        status: gwNum === 1 ? "FINISHED" : gwNum === 2 ? "ACTIVE" : "SCHEDULED",
        deadlineUtc: deadline.toISOString(),
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });
    });
  }

  async fetchFixtures(gameweekNumber = 1): Promise<ExternalFixture[]> {
    const isGw1Finished = gameweekNumber === 1;
    const rawFixtures = [
      {
        providerId: `mock-fixture-gw${gameweekNumber}-1`,
        homeClubProviderId: "mock-club-1",
        awayClubProviderId: "mock-club-2",
        gameweekNumber,
        kickoffTimeUtc: new Date(Date.UTC(2025, 8, 1, 19, 0, 0)).toISOString(),
        status: isGw1Finished ? "FINISHED" : "SCHEDULED",
        homeScore: isGw1Finished ? 2 : undefined,
        awayScore: isGw1Finished ? 1 : undefined,
        venue: "Stade Mohammed V",
      },
      {
        providerId: `mock-fixture-gw${gameweekNumber}-2`,
        homeClubProviderId: "mock-club-3",
        awayClubProviderId: "mock-club-4",
        gameweekNumber,
        kickoffTimeUtc: new Date(Date.UTC(2025, 8, 1, 21, 0, 0)).toISOString(),
        status: isGw1Finished ? "FINISHED" : "SCHEDULED",
        homeScore: isGw1Finished ? 0 : undefined,
        awayScore: isGw1Finished ? 0 : undefined,
        venue: "Stade Prince Moulay Abdellah",
      },
    ];
    return rawFixtures.map((f) => ExternalFixtureSchema.parse(f));
  }

  async fetchMatchEvents(
    fixtureProviderId: string,
  ): Promise<ExternalMatchEvent[]> {
    if (fixtureProviderId.includes("gw1-1")) {
      return [
        ExternalMatchEventSchema.parse({
          id: "mock-event-1",
          fixtureProviderId,
          minute: 23,
          type: "GOAL",
          playerProviderId: "mock-player-3",
          detail: "Header from corner",
        }),
        ExternalMatchEventSchema.parse({
          id: "mock-event-2",
          fixtureProviderId,
          minute: 45,
          type: "GOAL",
          playerProviderId: "mock-player-5",
          detail: "Right footed shot",
        }),
        ExternalMatchEventSchema.parse({
          id: "mock-event-3",
          fixtureProviderId,
          minute: 78,
          type: "YELLOW_CARD",
          playerProviderId: "mock-player-4",
          detail: "Foul",
        }),
      ];
    }
    return [];
  }

  async fetchPlayerFixtureStats(
    fixtureProviderId: string,
  ): Promise<ExternalPlayerMatchStats[]> {
    if (fixtureProviderId.includes("gw1-1")) {
      return [
        ExternalPlayerMatchStatsSchema.parse({
          fixtureProviderId,
          playerProviderId: "mock-player-1",
          minutesPlayed: 90,
          saves: 4,
          goalsConceded: 1,
          yellowCards: 0,
        }),
        ExternalPlayerMatchStatsSchema.parse({
          fixtureProviderId,
          playerProviderId: "mock-player-2",
          minutesPlayed: 90,
          assists: 1,
          cleanSheet: false,
          goalsConceded: 1,
        }),
        ExternalPlayerMatchStatsSchema.parse({
          fixtureProviderId,
          playerProviderId: "mock-player-3",
          minutesPlayed: 85,
          goals: 2,
          assists: 0,
        }),
        ExternalPlayerMatchStatsSchema.parse({
          fixtureProviderId,
          playerProviderId: "mock-player-4",
          minutesPlayed: 90,
          yellowCards: 1,
        }),
        ExternalPlayerMatchStatsSchema.parse({
          fixtureProviderId,
          playerProviderId: "mock-player-5",
          minutesPlayed: 90,
          goals: 1,
        }),
      ];
    }
    return [];
  }
}

// ─── API Football Provider Scaffolding ───────────────────────────────────────

export class ApiFootballProvider implements FootballDataProvider {
  private _apiKey: string;
  private _baseUrl: string;

  constructor(options?: { apiKey?: string; baseUrl?: string }) {
    const key = options?.apiKey || process.env.API_FOOTBALL_KEY;
    if (!key || key.trim() === "") {
      throw new Error(
        "ApiFootballProvider error: API_FOOTBALL_KEY credential is missing",
      );
    }
    this._apiKey = key;
    this._baseUrl = options?.baseUrl || "https://v3.football.api-sports.io";
  }

  getProviderName(): string {
    return "apifootball";
  }

  getApiKey(): string {
    return this._apiKey;
  }

  getBaseUrl(): string {
    return this._baseUrl;
  }

  async fetchCompetitions(): Promise<ExternalCompetition[]> {
    throw new Error(
      "ApiFootballProvider: API integration not configured without live API access",
    );
  }

  async fetchSeasons(): Promise<ExternalSeason[]> {
    throw new Error(
      "ApiFootballProvider: API integration not configured without live API access",
    );
  }

  async fetchClubs(): Promise<ExternalClub[]> {
    throw new Error(
      "ApiFootballProvider: API integration not configured without live API access",
    );
  }

  async fetchPlayers(): Promise<ExternalPlayer[]> {
    throw new Error(
      "ApiFootballProvider: API integration not configured without live API access",
    );
  }

  async fetchGameweeks(): Promise<ExternalGameweek[]> {
    throw new Error(
      "ApiFootballProvider: API integration not configured without live API access",
    );
  }

  async fetchFixtures(_gameweekNumber?: number): Promise<ExternalFixture[]> {
    throw new Error(
      "ApiFootballProvider: API integration not configured without live API access",
    );
  }

  async fetchMatchEvents(
    _fixtureProviderId: string,
  ): Promise<ExternalMatchEvent[]> {
    throw new Error(
      "ApiFootballProvider: API integration not configured without live API access",
    );
  }

  async fetchPlayerFixtureStats(
    _fixtureProviderId: string,
  ): Promise<ExternalPlayerMatchStats[]> {
    throw new Error(
      "ApiFootballProvider: API integration not configured without live API access",
    );
  }
}

// ─── Provider Factory ─────────────────────────────────────────────────────────

export function getFootballDataProvider(
  providerName?: string,
): FootballDataProvider {
  const provider = (
    providerName ||
    process.env.FOOTBALL_DATA_PROVIDER ||
    "mock"
  ).toLowerCase();
  if (provider === "apifootball") {
    return new ApiFootballProvider();
  }
  return new MockFootballDataProvider();
}
