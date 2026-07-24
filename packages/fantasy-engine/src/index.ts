export type PlayerPosition = "GK" | "DEF" | "MID" | "FWD";

export interface PlayerFixtureStatsInput {
  minutesPlayed: number;
  goals: number;
  assists: number;
  cleanSheet: boolean;
  saves: number;
  penaltiesSaved: number;
  penaltiesMissed: number;
  yellowCards: number;
  redCards: number;
  ownGoals: number;
  goalsConceded: number;
}

export interface ScoreBreakdownItem {
  key: string;
  points: number;
  count: number;
}

export interface ScoreCalculationResult {
  totalPoints: number;
  breakdown: ScoreBreakdownItem[];
}

export const INITIAL_BUDGET_TENTHS = 1000; // 100.0 credits stored as integer tenths
export const SQUAD_SIZE = 15;
export const LINEUP_SIZE = 11;
export const BENCH_SIZE = 4;
export const MAX_PLAYERS_PER_CLUB = 3;

export const REQUIRED_SQUAD_POSITIONS: Record<PlayerPosition, number> = {
  GK: 2,
  DEF: 5,
  MID: 5,
  FWD: 3,
};

export type ValidationCode =
  | "SQUAD_SIZE_INVALID"
  | "POSITION_COUNT_INVALID"
  | "BUDGET_EXCEEDED"
  | "CLUB_LIMIT_EXCEEDED"
  | "DUPLICATE_PLAYER"
  | "LINEUP_SIZE_INVALID"
  | "FORMATION_INVALID"
  | "PLAYER_NOT_IN_SQUAD"
  | "CAPTAIN_NOT_STARTER"
  | "CAPTAIN_EQUALS_VICE_CAPTAIN"
  | "BENCH_ORDER_INVALID"
  | "DEADLINE_LOCKED";

export interface ValidationIssue {
  code: ValidationCode;
  message: string;
  field?: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
}

export interface SquadPlayerInput {
  playerSeasonId: string;
  pricePoints: number; // in tenths
}

export interface PlayerData {
  playerSeasonId: string;
  position: PlayerPosition;
  clubId: string;
}

/**
 * Calculate total squad cost in integer tenths.
 */
export function calculateSquadCost(members: { pricePoints: number }[]): number {
  return members.reduce((sum, m) => sum + m.pricePoints, 0);
}

/**
 * Calculate remaining budget in integer tenths.
 */
export function calculateRemainingBudget(
  initialBudget: number,
  totalCost: number,
): number {
  return initialBudget - totalCost;
}

/**
 * Check if the deadline has passed for the given current time.
 */
export function isDeadlineLocked(
  deadlineUtc: Date | string,
  currentTimeUtc: Date | string,
): boolean {
  const deadline = new Date(deadlineUtc).getTime();
  const current = new Date(currentTimeUtc).getTime();
  return current >= deadline;
}

/**
 * Validate a 15-player squad against budget, squad size, position counts, club limit, and duplicates.
 */
export function validateSquad(
  squadMembers: SquadPlayerInput[],
  playersMap: Map<string, PlayerData>,
  budgetTenths: number = INITIAL_BUDGET_TENTHS,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  // 1. Squad size
  if (squadMembers.length !== SQUAD_SIZE) {
    issues.push({
      code: "SQUAD_SIZE_INVALID",
      message: `Squad must contain exactly ${SQUAD_SIZE} players. Received ${squadMembers.length}.`,
      field: "squadMembers",
    });
  }

  // 2. Duplicate players
  const seenIds = new Set<string>();
  for (const m of squadMembers) {
    if (seenIds.has(m.playerSeasonId)) {
      issues.push({
        code: "DUPLICATE_PLAYER",
        message: `Duplicate player detected in squad: ${m.playerSeasonId}.`,
        field: "squadMembers",
      });
    } else {
      seenIds.add(m.playerSeasonId);
    }
  }

  // 3. Budget limit
  const totalCost = calculateSquadCost(squadMembers);
  if (totalCost > budgetTenths) {
    issues.push({
      code: "BUDGET_EXCEEDED",
      message: `Total squad cost (${(totalCost / 10).toFixed(1)}) exceeds available budget (${(budgetTenths / 10).toFixed(1)}).`,
      field: "budgetPoints",
    });
  }

  // 4. Position counts & Club limits
  const positionCounts: Record<PlayerPosition, number> = {
    GK: 0,
    DEF: 0,
    MID: 0,
    FWD: 0,
  };
  const clubCounts: Record<string, number> = {};

  for (const m of squadMembers) {
    const info = playersMap.get(m.playerSeasonId);
    if (info) {
      positionCounts[info.position] = (positionCounts[info.position] || 0) + 1;
      clubCounts[info.clubId] = (clubCounts[info.clubId] || 0) + 1;
    }
  }

  // Position count checks
  (Object.keys(REQUIRED_SQUAD_POSITIONS) as PlayerPosition[]).forEach((pos) => {
    const req = REQUIRED_SQUAD_POSITIONS[pos];
    const actual = positionCounts[pos];
    if (actual !== req) {
      issues.push({
        code: "POSITION_COUNT_INVALID",
        message: `Squad must contain exactly ${req} ${pos}s. Received ${actual}.`,
        field: `position.${pos}`,
      });
    }
  });

  // Club limit checks
  for (const [clubId, count] of Object.entries(clubCounts)) {
    if (count > MAX_PLAYERS_PER_CLUB) {
      issues.push({
        code: "CLUB_LIMIT_EXCEEDED",
        message: `Squad contains ${count} players from club ${clubId}. Maximum allowed is ${MAX_PLAYERS_PER_CLUB}.`,
        field: `club.${clubId}`,
      });
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Derive formation string (e.g. "4-4-2", "3-5-2") from starting lineup.
 */
export function deriveFormation(
  startingPlayerIds: string[],
  playersMap: Map<string, PlayerData>,
): string {
  let def = 0;
  let mid = 0;
  let fwd = 0;

  for (const id of startingPlayerIds) {
    const info = playersMap.get(id);
    if (info) {
      if (info.position === "DEF") def++;
      if (info.position === "MID") mid++;
      if (info.position === "FWD") fwd++;
    }
  }

  return `${def}-${mid}-${fwd}`;
}

/**
 * Validate starting 11 lineup against squad membership, size, and formation boundaries.
 */
export function validateStartingLineup(
  startingPlayerIds: string[],
  squadPlayerIds: string[],
  playersMap: Map<string, PlayerData>,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const squadSet = new Set(squadPlayerIds);

  // 1. Lineup size
  if (startingPlayerIds.length !== LINEUP_SIZE) {
    issues.push({
      code: "LINEUP_SIZE_INVALID",
      message: `Starting lineup must contain exactly ${LINEUP_SIZE} players. Received ${startingPlayerIds.length}.`,
      field: "startingPlayerIds",
    });
  }

  // 2. All starting players must be in squad
  for (const id of startingPlayerIds) {
    if (!squadSet.has(id)) {
      issues.push({
        code: "PLAYER_NOT_IN_SQUAD",
        message: `Starting player ${id} is not in the saved squad.`,
        field: "startingPlayerIds",
      });
    }
  }

  // 3. Formation checks
  const counts: Record<PlayerPosition, number> = {
    GK: 0,
    DEF: 0,
    MID: 0,
    FWD: 0,
  };

  for (const id of startingPlayerIds) {
    const info = playersMap.get(id);
    if (info) {
      counts[info.position] = (counts[info.position] || 0) + 1;
    }
  }

  if (counts.GK !== 1) {
    issues.push({
      code: "FORMATION_INVALID",
      message: `Starting lineup must have exactly 1 GK. Received ${counts.GK}.`,
      field: "starting.GK",
    });
  }
  if (counts.DEF < 3) {
    issues.push({
      code: "FORMATION_INVALID",
      message: `Starting lineup must have at least 3 DEF. Received ${counts.DEF}.`,
      field: "starting.DEF",
    });
  }
  if (counts.MID < 2) {
    issues.push({
      code: "FORMATION_INVALID",
      message: `Starting lineup must have at least 2 MID. Received ${counts.MID}.`,
      field: "starting.MID",
    });
  }
  if (counts.FWD < 1) {
    issues.push({
      code: "FORMATION_INVALID",
      message: `Starting lineup must have at least 1 FWD. Received ${counts.FWD}.`,
      field: "starting.FWD",
    });
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Validate bench player order and completeness.
 */
export function validateBench(
  benchPlayerIds: string[],
  squadPlayerIds: string[],
  startingPlayerIds: string[],
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const squadSet = new Set(squadPlayerIds);
  const startingSet = new Set(startingPlayerIds);

  if (benchPlayerIds.length !== BENCH_SIZE) {
    issues.push({
      code: "BENCH_ORDER_INVALID",
      message: `Bench must contain exactly ${BENCH_SIZE} players. Received ${benchPlayerIds.length}.`,
      field: "benchPlayerIds",
    });
  }

  const expectedBench = squadPlayerIds.filter((id) => !startingSet.has(id));
  const expectedBenchSet = new Set(expectedBench);

  for (const id of benchPlayerIds) {
    if (!squadSet.has(id)) {
      issues.push({
        code: "PLAYER_NOT_IN_SQUAD",
        message: `Bench player ${id} is not in the saved squad.`,
        field: "benchPlayerIds",
      });
    }
    if (startingSet.has(id)) {
      issues.push({
        code: "BENCH_ORDER_INVALID",
        message: `Bench player ${id} is already in starting lineup.`,
        field: "benchPlayerIds",
      });
    }
    if (!expectedBenchSet.has(id)) {
      issues.push({
        code: "BENCH_ORDER_INVALID",
        message: `Player ${id} is not part of the expected bench.`,
        field: "benchPlayerIds",
      });
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Validate captain and vice-captain selection.
 */
export function validateCaptaincy(
  captainId: string | null | undefined,
  viceCaptainId: string | null | undefined,
  startingPlayerIds: string[],
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const startingSet = new Set(startingPlayerIds);

  if (!captainId) {
    issues.push({
      code: "CAPTAIN_NOT_STARTER",
      message: "Captain must be selected.",
      field: "captainId",
    });
  } else if (!startingSet.has(captainId)) {
    issues.push({
      code: "CAPTAIN_NOT_STARTER",
      message: `Captain (${captainId}) must be a starting player.`,
      field: "captainId",
    });
  }

  if (!viceCaptainId) {
    issues.push({
      code: "CAPTAIN_NOT_STARTER",
      message: "Vice-captain must be selected.",
      field: "viceCaptainId",
    });
  } else if (!startingSet.has(viceCaptainId)) {
    issues.push({
      code: "CAPTAIN_NOT_STARTER",
      message: `Vice-captain (${viceCaptainId}) must be a starting player.`,
      field: "viceCaptainId",
    });
  }

  if (captainId && viceCaptainId && captainId === viceCaptainId) {
    issues.push({
      code: "CAPTAIN_EQUALS_VICE_CAPTAIN",
      message: "Captain and vice-captain must be different players.",
      field: "viceCaptainId",
    });
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

export function calculatePlayerScore(
  position: PlayerPosition,
  stats: PlayerFixtureStatsInput,
): ScoreCalculationResult {
  const breakdown: ScoreBreakdownItem[] = [];
  let totalPoints = 0;

  // Minutes played
  if (stats.minutesPlayed >= 60) {
    breakdown.push({ key: "MINUTES_60_PLUS", points: 2, count: 1 });
    totalPoints += 2;
  } else if (stats.minutesPlayed > 0) {
    breakdown.push({ key: "MINUTES_1_TO_59", points: 1, count: 1 });
    totalPoints += 1;
  }

  // Goals
  if (stats.goals > 0) {
    const goalPts =
      position === "GK" || position === "DEF" ? 6 : position === "MID" ? 5 : 4;
    const pts = stats.goals * goalPts;
    breakdown.push({ key: "GOALS", points: pts, count: stats.goals });
    totalPoints += pts;
  }

  // Assists
  if (stats.assists > 0) {
    const pts = stats.assists * 3;
    breakdown.push({ key: "ASSISTS", points: pts, count: stats.assists });
    totalPoints += pts;
  }

  // Clean sheet (requires 60+ mins)
  if (stats.cleanSheet && stats.minutesPlayed >= 60) {
    if (position === "GK" || position === "DEF") {
      breakdown.push({ key: "CLEAN_SHEET", points: 4, count: 1 });
      totalPoints += 4;
    } else if (position === "MID") {
      breakdown.push({ key: "CLEAN_SHEET", points: 1, count: 1 });
      totalPoints += 1;
    }
  }

  // Saves (every 3 saves)
  if (stats.saves >= 3 && position === "GK") {
    const savePts = Math.floor(stats.saves / 3);
    breakdown.push({ key: "SAVES", points: savePts, count: stats.saves });
    totalPoints += savePts;
  }

  // Penalties saved / missed
  if (stats.penaltiesSaved > 0) {
    const pts = stats.penaltiesSaved * 5;
    breakdown.push({
      key: "PENALTY_SAVED",
      points: pts,
      count: stats.penaltiesSaved,
    });
    totalPoints += pts;
  }
  if (stats.penaltiesMissed > 0) {
    const pts = stats.penaltiesMissed * -2;
    breakdown.push({
      key: "PENALTY_MISSED",
      points: pts,
      count: stats.penaltiesMissed,
    });
    totalPoints += pts;
  }

  // Cards & Own Goals
  if (stats.yellowCards > 0) {
    const pts = stats.yellowCards * -1;
    breakdown.push({
      key: "YELLOW_CARD",
      points: pts,
      count: stats.yellowCards,
    });
    totalPoints += pts;
  }
  if (stats.redCards > 0) {
    const pts = stats.redCards * -3;
    breakdown.push({ key: "RED_CARD", points: pts, count: stats.redCards });
    totalPoints += pts;
  }
  if (stats.ownGoals > 0) {
    const pts = stats.ownGoals * -2;
    breakdown.push({ key: "OWN_GOAL", points: pts, count: stats.ownGoals });
    totalPoints += pts;
  }

  // Goals conceded after 60+ mins (GK / DEF: every 2 goals = -1)
  if (stats.minutesPlayed >= 60 && (position === "GK" || position === "DEF")) {
    const concededDeduction = Math.floor(stats.goalsConceded / 2);
    if (concededDeduction > 0) {
      breakdown.push({
        key: "GOALS_CONCEDED",
        points: -concededDeduction,
        count: stats.goalsConceded,
      });
      totalPoints -= concededDeduction;
    }
  }

  return { totalPoints, breakdown };
}
