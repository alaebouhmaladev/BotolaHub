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
