import { z } from "zod";

// ─── Health Contract ─────────────────────────────────────────────────────────

export const HealthResponseSchema = z.object({
  status: z.enum(["ok", "degraded", "error"]),
  timestamp: z.string(),
  uptimeSeconds: z.number(),
  version: z.string(),
  services: z.object({
    database: z.enum(["up", "down"]),
    redis: z.enum(["up", "down"]),
  }),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// ─── Auth Contracts ──────────────────────────────────────────────────────────

export const RegisterDtoSchema = z.object({
  email: z.string().email("Invalid email address"),
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(50, "Display name must be at most 50 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain uppercase, lowercase, and numbers",
    ),
  preferredLanguage: z.enum(["ar", "fr", "en"]).default("en"),
});

export type RegisterDtoType = z.infer<typeof RegisterDtoSchema>;

export const LoginDtoSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginDtoType = z.infer<typeof LoginDtoSchema>;

export const RefreshTokenDtoSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export type RefreshTokenDtoType = z.infer<typeof RefreshTokenDtoSchema>;

export const UserSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  role: z.string(),
  preferredLanguage: z.string().optional(),
  createdAt: z.string().optional(),
});

export type User = z.infer<typeof UserSchema>;

export const WebAuthSuccessDataSchema = z.object({
  accessToken: z.string(),
  user: UserSchema,
});

export type WebAuthSuccessData = z.infer<typeof WebAuthSuccessDataSchema>;

export const MobileAuthSuccessDataSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: UserSchema,
});

export type MobileAuthSuccessData = z.infer<typeof MobileAuthSuccessDataSchema>;

export const AuthSuccessDataSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  user: UserSchema,
});

export type AuthSuccessData = z.infer<typeof AuthSuccessDataSchema>;

// ─── Catalog Contracts ───────────────────────────────────────────────────────

export const PositionEnum = z.enum(["GK", "DEF", "MID", "FWD"]);
export type Position = z.infer<typeof PositionEnum>;

export const PlayerStatusEnum = z.enum([
  "AVAILABLE",
  "INJURED",
  "SUSPENDED",
  "UNKNOWN",
]);
export type PlayerStatus = z.infer<typeof PlayerStatusEnum>;

export const CompetitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameAr: z.string(),
  nameFr: z.string(),
  country: z.string(),
});
export type Competition = z.infer<typeof CompetitionSchema>;

export const SeasonSchema = z.object({
  id: z.string(),
  competitionId: z.string(),
  label: z.string(),
  isActive: z.boolean(),
  startDate: z.string(),
  endDate: z.string(),
});
export type Season = z.infer<typeof SeasonSchema>;

export const ClubSchema = z.object({
  id: z.string(),
  seasonId: z.string(),
  name: z.string(),
  nameAr: z.string(),
  nameFr: z.string(),
  shortName: z.string(),
  city: z.string(),
  crestUrl: z.string().nullable().optional(),
});
export type Club = z.infer<typeof ClubSchema>;

export const PlayerSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  firstNameAr: z.string().nullable().optional(),
  lastNameAr: z.string().nullable().optional(),
  position: PositionEnum,
  nationality: z.string(),
});
export type Player = z.infer<typeof PlayerSchema>;

export const PlayerSeasonSchema = z.object({
  id: z.string(),
  playerId: z.string(),
  seasonId: z.string(),
  clubId: z.string(),
  status: PlayerStatusEnum,
  pricePoints: z.number(), // stored in integer tenths (55 = 5.5)
  player: PlayerSchema.optional(),
  club: ClubSchema.optional(),
});
export type PlayerSeason = z.infer<typeof PlayerSeasonSchema>;

export const GameweekStatusEnum = z.enum([
  "SCHEDULED",
  "ACTIVE",
  "FINISHED",
  "LOCKED",
]);
export type GameweekStatus = z.infer<typeof GameweekStatusEnum>;

export const GameweekSchema = z.object({
  id: z.string(),
  seasonId: z.string(),
  number: z.number(),
  status: GameweekStatusEnum,
  deadlineUtc: z.string(),
  startDate: z.string(),
  endDate: z.string(),
});
export type Gameweek = z.infer<typeof GameweekSchema>;

export const FixtureStatusEnum = z.enum([
  "SCHEDULED",
  "LIVE",
  "FINISHED",
  "POSTPONED",
  "CANCELLED",
]);
export type FixtureStatus = z.infer<typeof FixtureStatusEnum>;

export const FixtureSchema = z.object({
  id: z.string(),
  gameweekId: z.string(),
  homeClubId: z.string(),
  awayClubId: z.string(),
  status: FixtureStatusEnum,
  kickoffUtc: z.string(),
  homeScore: z.number().nullable().optional(),
  awayScore: z.number().nullable().optional(),
  venue: z.string().nullable().optional(),
  homeClub: ClubSchema.optional(),
  awayClub: ClubSchema.optional(),
});
export type Fixture = z.infer<typeof FixtureSchema>;

export const FixtureEventSchema = z.object({
  id: z.string(),
  fixtureId: z.string(),
  minute: z.number(),
  type: z.string(),
  playerId: z.string().nullable().optional(),
  detail: z.string().nullable().optional(),
  createdAt: z.string().optional(),
});
export type FixtureEvent = z.infer<typeof FixtureEventSchema>;

export const PlayerFixtureStatsSchema = z.object({
  id: z.string(),
  playerSeasonId: z.string(),
  fixtureId: z.string(),
  minutesPlayed: z.number(),
  goals: z.number(),
  assists: z.number(),
  cleanSheet: z.boolean(),
  yellowCards: z.number(),
  redCards: z.number(),
  saves: z.number(),
  penaltySaves: z.number(),
  penaltyMisses: z.number(),
  ownGoals: z.number(),
  goalsConceded: z.number(),
  playerSeason: PlayerSeasonSchema.optional(),
});
export type PlayerFixtureStats = z.infer<typeof PlayerFixtureStatsSchema>;

export const PlayerFilterQuerySchema = z.object({
  search: z.string().optional(),
  clubId: z.string().optional(),
  position: PositionEnum.optional(),
  minPrice: z.coerce.number().optional(), // in tenths
  maxPrice: z.coerce.number().optional(), // in tenths
  status: PlayerStatusEnum.optional(),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(50),
});
export type PlayerFilterQuery = z.infer<typeof PlayerFilterQuerySchema>;

export function createPaginatedResponseSchema<T extends z.ZodTypeAny>(
  itemSchema: T,
) {
  return z.object({
    items: z.array(itemSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  });
}

// ─── Fantasy Team Contracts ──────────────────────────────────────────────────

export const ValidationCodeEnum = z.enum([
  "SQUAD_SIZE_INVALID",
  "POSITION_COUNT_INVALID",
  "BUDGET_EXCEEDED",
  "CLUB_LIMIT_EXCEEDED",
  "DUPLICATE_PLAYER",
  "LINEUP_SIZE_INVALID",
  "FORMATION_INVALID",
  "PLAYER_NOT_IN_SQUAD",
  "CAPTAIN_NOT_STARTER",
  "CAPTAIN_EQUALS_VICE_CAPTAIN",
  "BENCH_ORDER_INVALID",
  "DEADLINE_LOCKED",
]);
export type ValidationCode = z.infer<typeof ValidationCodeEnum>;

export const ValidationIssueSchema = z.object({
  code: ValidationCodeEnum,
  message: z.string(),
  field: z.string().optional(),
});
export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;

export const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  issues: z.array(ValidationIssueSchema),
});
export type ValidationResult = z.infer<typeof ValidationResultSchema>;

export const CreateFantasyTeamDtoSchema = z.object({
  name: z
    .string()
    .min(2, "Team name must be at least 2 characters")
    .max(50, "Team name must be at most 50 characters"),
});
export type CreateFantasyTeamDto = z.infer<typeof CreateFantasyTeamDtoSchema>;

export const UpdateSquadDtoSchema = z.object({
  squadPlayerIds: z
    .array(z.string())
    .length(15, "Squad must contain exactly 15 player IDs"),
});
export type UpdateSquadDto = z.infer<typeof UpdateSquadDtoSchema>;

export const UpdateLineupDtoSchema = z.object({
  startingPlayerIds: z
    .array(z.string())
    .length(11, "Starting lineup must contain exactly 11 player IDs"),
  benchPlayerIds: z
    .array(z.string())
    .length(4, "Bench must contain exactly 4 player IDs"),
  captainId: z.string().min(1, "Captain is required"),
  viceCaptainId: z.string().min(1, "Vice-captain is required"),
});
export type UpdateLineupDto = z.infer<typeof UpdateLineupDtoSchema>;

export const FantasySquadMemberSchema = z.object({
  id: z.string(),
  fantasyTeamId: z.string(),
  playerSeasonId: z.string(),
  purchasePrice: z.number(),
  playerSeason: PlayerSeasonSchema.optional(),
});
export type FantasySquadMember = z.infer<typeof FantasySquadMemberSchema>;

export const GameweekLineupPlayerSchema = z.object({
  id: z.string(),
  lineupId: z.string(),
  playerSeasonId: z.string(),
  isStarting: z.boolean(),
  benchOrder: z.number().nullable().optional(),
  playerSeason: PlayerSeasonSchema.optional(),
});
export type GameweekLineupPlayer = z.infer<typeof GameweekLineupPlayerSchema>;

export const GameweekLineupSchema = z.object({
  id: z.string(),
  fantasyTeamId: z.string(),
  gameweekId: z.string(),
  captainId: z.string().nullable().optional(),
  viceCaptainId: z.string().nullable().optional(),
  isFinalised: z.boolean(),
  players: z.array(GameweekLineupPlayerSchema).optional(),
});
export type GameweekLineup = z.infer<typeof GameweekLineupSchema>;

export const FantasyTeamSchema = z.object({
  id: z.string(),
  userId: z.string(),
  seasonId: z.string(),
  name: z.string(),
  budgetPoints: z.number(),
  totalPoints: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  squadMembers: z.array(FantasySquadMemberSchema).optional(),
  gameweekLineups: z.array(GameweekLineupSchema).optional(),
});
export type FantasyTeam = z.infer<typeof FantasyTeamSchema>;

// ─── Transfer Contracts ──────────────────────────────────────────────────────

export const TransferPairSchema = z.object({
  outgoingPlayerSeasonId: z.string(),
  incomingPlayerSeasonId: z.string(),
});
export type TransferPair = z.infer<typeof TransferPairSchema>;

export const TransferPreviewDtoSchema = z.object({
  transfers: z
    .array(TransferPairSchema)
    .min(1, "At least one transfer required"),
});
export type TransferPreviewDto = z.infer<typeof TransferPreviewDtoSchema>;

export const TransferPreviewResultSchema = z.object({
  isValid: z.boolean(),
  transfersCount: z.number(),
  freeTransfersAvailable: z.number(),
  paidTransfersCount: z.number(),
  deductionPoints: z.number(),
  costDifferenceTenths: z.number(),
  newBudgetPoints: z.number(),
  issues: z.array(ValidationIssueSchema),
});
export type TransferPreviewResult = z.infer<typeof TransferPreviewResultSchema>;

export const TransferConfirmDtoSchema = z.object({
  transfers: z
    .array(TransferPairSchema)
    .min(1, "At least one transfer required"),
  idempotencyKey: z.string().optional(),
});
export type TransferConfirmDto = z.infer<typeof TransferConfirmDtoSchema>;

export const TransferConfirmResultSchema = z.object({
  success: z.boolean(),
  transfersCount: z.number(),
  deductionPoints: z.number(),
  remainingBudgetPoints: z.number(),
  transferGroupKey: z.string(),
  squad: z.array(FantasySquadMemberSchema),
});
export type TransferConfirmResult = z.infer<typeof TransferConfirmResultSchema>;

export const TransferHistoryItemSchema = z.object({
  id: z.string(),
  fantasyTeamId: z.string(),
  gameweekId: z.string(),
  transferGroupKey: z.string().nullable().optional(),
  type: z.enum(["IN", "OUT"]),
  playerSeasonId: z.string(),
  outgoingPlayerSeasonId: z.string().nullable().optional(),
  incomingPlayerSeasonId: z.string().nullable().optional(),
  pricePoints: z.number(),
  pointsCost: z.number(),
  deductionPoints: z.number(),
  createdAt: z.string(),
  playerSeason: PlayerSeasonSchema.optional(),
});
export type TransferHistoryItem = z.infer<typeof TransferHistoryItemSchema>;

// ─── Scoring Contracts ───────────────────────────────────────────────────────

export const PlayerGameweekScoreSchema = z.object({
  id: z.string(),
  playerSeasonId: z.string(),
  gameweekId: z.string(),
  points: z.number(),
  breakdown: z.array(
    z.object({
      key: z.string(),
      points: z.number(),
      count: z.number(),
    }),
  ),
  createdAt: z.string().optional(),
});
export type PlayerGameweekScore = z.infer<typeof PlayerGameweekScoreSchema>;

export const TeamGameweekScoreSchema = z.object({
  id: z.string(),
  fantasyTeamId: z.string(),
  gameweekId: z.string(),
  points: z.number(),
  transferCost: z.number(),
  captainBonus: z.number(),
  breakdown: z.object({
    startingPoints: z.number(),
    captainBonusPoints: z.number(),
    transferDeductionPoints: z.number(),
    activeCaptainId: z.string(),
    isViceCaptainActive: z.boolean(),
  }),
  isProvisional: z.boolean(),
  createdAt: z.string().optional(),
});
export type TeamGameweekScore = z.infer<typeof TeamGameweekScoreSchema>;
