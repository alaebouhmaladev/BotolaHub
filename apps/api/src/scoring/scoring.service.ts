import { Injectable, Logger, NotFoundException, Inject } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import {
  calculatePlayerScore,
  calculateTeamGameweekScore,
} from "@botolahub/fantasy-engine";
import { Prisma } from "@botolahub/database";

export interface ScoringSummary {
  scoringRunId: string;
  gameweekId: string;
  status: string;
  playerScoresCalculated: number;
  teamScoresCalculated: number;
}

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Calculate and persist fantasy scores for all player seasons and fantasy teams in a gameweek.
   */
  async scoreGameweek(gameweekId: string): Promise<ScoringSummary> {
    const startedAt = new Date();
    this.logger.log(`Starting scoreGameweek for gameweek ${gameweekId}...`);

    const gameweek = await this.prisma.client.gameweek.findUnique({
      where: { id: gameweekId },
    });
    if (!gameweek) {
      throw new NotFoundException(`Gameweek with ID ${gameweekId} not found`);
    }

    const run = await this.prisma.client.scoringRun.create({
      data: {
        gameweekId,
        status: "PENDING",
        startedAt,
      },
    });

    try {
      // 1. Fetch all player fixture stats for this gameweek's fixtures
      const fixtures = await this.prisma.client.fixture.findMany({
        where: { gameweekId },
        select: { id: true },
      });
      const fixtureIds = fixtures.map((f) => f.id);

      const statsList = await this.prisma.client.playerFixtureStats.findMany({
        where: { fixtureId: { in: fixtureIds } },
        include: {
          playerSeason: {
            include: { player: true },
          },
        },
      });

      let playerScoresCalculated = 0;

      // Group stats by playerSeasonId (in case player has multiple fixtures in double GW)
      const playerStatsMap = new Map<string, typeof statsList>();
      for (const stat of statsList) {
        const existing = playerStatsMap.get(stat.playerSeasonId) || [];
        existing.push(stat);
        playerStatsMap.set(stat.playerSeasonId, existing);
      }

      // Calculate & upsert FantasyPlayerScore for each player season
      for (const [playerSeasonId, pStats] of playerStatsMap.entries()) {
        const position = pStats[0].playerSeason.player.position;
        let totalPoints = 0;
        const aggregatedBreakdown: Prisma.InputJsonValue[] = [];

        for (const stat of pStats) {
          const res = calculatePlayerScore(position, {
            minutesPlayed: stat.minutesPlayed,
            goals: stat.goals,
            assists: stat.assists,
            cleanSheet: stat.cleanSheet,
            saves: stat.saves,
            penaltiesSaved: stat.penaltySaves,
            penaltiesMissed: stat.penaltyMisses,
            yellowCards: stat.yellowCards,
            redCards: stat.redCards,
            ownGoals: stat.ownGoals,
            goalsConceded: stat.goalsConceded,
          });
          totalPoints += res.totalPoints;
          aggregatedBreakdown.push(
            ...(res.breakdown as unknown as Prisma.InputJsonValue[]),
          );
        }

        await this.prisma.client.fantasyPlayerScore.upsert({
          where: {
            playerSeasonId_gameweekId: {
              playerSeasonId,
              gameweekId,
            },
          },
          create: {
            playerSeasonId,
            gameweekId,
            points: totalPoints,
            breakdown: aggregatedBreakdown,
          },
          update: {
            points: totalPoints,
            breakdown: aggregatedBreakdown,
          },
        });
        playerScoresCalculated++;
      }

      // 2. Fetch all fantasy teams and calculate Gameweek score
      const fantasyTeams = await this.prisma.client.fantasyTeam.findMany({
        where: { seasonId: gameweek.seasonId },
        include: {
          gameweekLineups: {
            where: { gameweekId },
            include: {
              players: {
                include: {
                  playerSeason: true,
                },
              },
            },
          },
        },
      });

      let teamScoresCalculated = 0;

      for (const team of fantasyTeams) {
        const lineup = team.gameweekLineups[0];
        const startingPlayerInputs: {
          playerSeasonId: string;
          basePoints: number;
          minutesPlayed: number;
        }[] = [];
        let captainId = "";
        let viceCaptainId = "";

        if (lineup) {
          captainId = lineup.captainId || "";
          viceCaptainId = lineup.viceCaptainId || "";

          const startingLineupPlayers = lineup.players.filter(
            (p) => p.isStarting,
          );

          for (const lp of startingLineupPlayers) {
            const scoreRecord =
              await this.prisma.client.fantasyPlayerScore.findUnique({
                where: {
                  playerSeasonId_gameweekId: {
                    playerSeasonId: lp.playerSeasonId,
                    gameweekId,
                  },
                },
              });

            const statRecord =
              await this.prisma.client.playerFixtureStats.findFirst({
                where: {
                  playerSeasonId: lp.playerSeasonId,
                  fixtureId: { in: fixtureIds },
                },
              });

            startingPlayerInputs.push({
              playerSeasonId: lp.playerSeasonId,
              basePoints: scoreRecord?.points || 0,
              minutesPlayed: statRecord?.minutesPlayed || 0,
            });
          }
        }

        // Fetch transfer deductions for this fantasy team in this gameweek
        const transfers = await this.prisma.client.transfer.findMany({
          where: { fantasyTeamId: team.id, gameweekId },
        });

        const deductionPoints =
          transfers.length > 0 ? transfers[0].deductionPoints : 0;

        const teamScoreRes = calculateTeamGameweekScore(
          startingPlayerInputs,
          captainId,
          viceCaptainId,
          deductionPoints,
        );

        await this.prisma.client.fantasyTeamGameweekScore.upsert({
          where: {
            fantasyTeamId_gameweekId: {
              fantasyTeamId: team.id,
              gameweekId,
            },
          },
          create: {
            fantasyTeamId: team.id,
            gameweekId,
            points: teamScoreRes.totalPoints,
            transferCost: deductionPoints,
            captainBonus: teamScoreRes.captainBonusPoints,
            breakdown: teamScoreRes as unknown as Prisma.InputJsonValue,
            isProvisional: false,
          },
          update: {
            points: teamScoreRes.totalPoints,
            transferCost: deductionPoints,
            captainBonus: teamScoreRes.captainBonusPoints,
            breakdown: teamScoreRes as unknown as Prisma.InputJsonValue,
            isProvisional: false,
          },
        });

        teamScoresCalculated++;
      }

      await this.prisma.client.scoringRun.update({
        where: { id: run.id },
        data: {
          status: "SUCCESS",
          playerScoresCalculated,
          teamScoresCalculated,
          finishedAt: new Date(),
        },
      });

      return {
        scoringRunId: run.id,
        gameweekId,
        status: "SUCCESS",
        playerScoresCalculated,
        teamScoresCalculated,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`scoreGameweek failed: ${errorMsg}`);
      await this.prisma.client.scoringRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
        },
      });
      throw err;
    }
  }

  async getTeamGameweekScore(teamId: string, gameweekId: string) {
    const score = await this.prisma.client.fantasyTeamGameweekScore.findUnique({
      where: {
        fantasyTeamId_gameweekId: {
          fantasyTeamId: teamId,
          gameweekId,
        },
      },
    });

    if (!score) {
      throw new NotFoundException(
        `Gameweek score for team ${teamId} in gameweek ${gameweekId} not found`,
      );
    }
    return score;
  }
}
