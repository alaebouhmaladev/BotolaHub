import { Injectable, Logger, Inject } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import {
  getFootballDataProvider,
  FootballDataProvider,
} from "@botolahub/data-providers";

export interface IngestionSummary {
  ingestionRunId: string;
  provider: string;
  jobType: string;
  status: string;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  recordCount: number;
}

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);
  private provider: FootballDataProvider;

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {
    this.provider = getFootballDataProvider();
  }

  /**
   * Ingest competitions & seasons.
   */
  async syncCompetitions(): Promise<IngestionSummary> {
    const startedAt = new Date();
    const providerName = this.provider.getProviderName();
    this.logger.log(
      `Starting syncCompetitions for provider ${providerName}...`,
    );

    const run = await this.prisma.client.ingestionRun.create({
      data: {
        provider: providerName,
        jobType: "competitions",
        status: "PENDING",
        startedAt,
      },
    });

    let insertedCount = 0;
    let updatedCount = 0;
    const skippedCount = 0;
    const failedCount = 0;

    try {
      const comps = await this.provider.fetchCompetitions();
      for (const comp of comps) {
        const mapping =
          await this.prisma.client.providerEntityMapping.findUnique({
            where: {
              provider_entityType_providerId: {
                provider: providerName,
                entityType: "competition",
                providerId: comp.providerId,
              },
            },
          });

        if (!mapping) {
          const dbComp = await this.prisma.client.competition.upsert({
            where: { id: comp.providerId },
            create: {
              id: comp.providerId,
              name: comp.name,
              nameAr: comp.nameAr,
              nameFr: comp.nameFr,
              country: comp.country,
            },
            update: {
              name: comp.name,
              nameAr: comp.nameAr,
              nameFr: comp.nameFr,
            },
          });

          await this.prisma.client.providerEntityMapping.create({
            data: {
              provider: providerName,
              entityType: "competition",
              providerId: comp.providerId,
              competitionId: dbComp.id,
            },
          });
          insertedCount++;
        } else {
          await this.prisma.client.competition.update({
            where: { id: mapping.competitionId! },
            data: { name: comp.name, nameAr: comp.nameAr, nameFr: comp.nameFr },
          });
          updatedCount++;
        }
      }

      const finishedAt = new Date();
      await this.prisma.client.ingestionRun.update({
        where: { id: run.id },
        data: {
          status: "SUCCESS",
          recordCount: comps.length,
          insertedCount,
          updatedCount,
          skippedCount,
          failedCount,
          finishedAt,
        },
      });

      return {
        ingestionRunId: run.id,
        provider: providerName,
        jobType: "competitions",
        status: "SUCCESS",
        insertedCount,
        updatedCount,
        skippedCount,
        failedCount,
        recordCount: comps.length,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`syncCompetitions failed: ${errorMsg}`);
      await this.prisma.client.ingestionRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          errorDetail: errorMsg,
          finishedAt: new Date(),
        },
      });
      throw err;
    }
  }

  /**
   * Ingest clubs & players deterministically.
   */
  async syncClubsAndPlayers(): Promise<IngestionSummary> {
    const startedAt = new Date();
    const providerName = this.provider.getProviderName();
    this.logger.log(
      `Starting syncClubsAndPlayers for provider ${providerName}...`,
    );

    const run = await this.prisma.client.ingestionRun.create({
      data: {
        provider: providerName,
        jobType: "clubs_players",
        status: "PENDING",
        startedAt,
      },
    });

    let insertedCount = 0;
    let updatedCount = 0;
    const skippedCount = 0;
    let failedCount = 0;

    try {
      const activeSeason = await this.prisma.client.season.findFirst({
        where: { isActive: true },
      });
      if (!activeSeason)
        throw new Error("No active season found for ingestion");

      const clubs = await this.provider.fetchClubs();
      const clubMappingMap = new Map<string, string>();

      for (const club of clubs) {
        let mapping = await this.prisma.client.providerEntityMapping.findUnique(
          {
            where: {
              provider_entityType_providerId: {
                provider: providerName,
                entityType: "club",
                providerId: club.providerId,
              },
            },
          },
        );

        if (!mapping) {
          const dbClub = await this.prisma.client.club.upsert({
            where: {
              seasonId_shortName: {
                seasonId: activeSeason.id,
                shortName: club.shortName,
              },
            },
            create: {
              id: `club-${club.shortName.toLowerCase()}`,
              seasonId: activeSeason.id,
              name: club.name,
              nameAr: club.name,
              nameFr: club.name,
              shortName: club.shortName,
              city: "Morocco",
              crestUrl:
                club.logoUrl ||
                `/assets/crests/${club.shortName.toLowerCase()}.svg`,
            },
            update: { name: club.name },
          });

          mapping = await this.prisma.client.providerEntityMapping.create({
            data: {
              provider: providerName,
              entityType: "club",
              providerId: club.providerId,
              clubId: dbClub.id,
            },
          });
          insertedCount++;
        } else {
          updatedCount++;
        }
        clubMappingMap.set(club.providerId, mapping.clubId!);
      }

      const players = await this.provider.fetchPlayers();
      for (const player of players) {
        const clubId = clubMappingMap.get(player.clubProviderId);
        if (!clubId) {
          failedCount++;
          continue;
        }

        let playerMapping =
          await this.prisma.client.providerEntityMapping.findUnique({
            where: {
              provider_entityType_providerId: {
                provider: providerName,
                entityType: "player",
                providerId: player.providerId,
              },
            },
          });

        const nameParts = player.name.split(" ");
        const firstName = nameParts[0] || "Player";
        const lastName = nameParts.slice(1).join(" ") || "Unknown";

        if (!playerMapping) {
          const dbPlayer = await this.prisma.client.player.create({
            data: {
              firstName,
              lastName,
              position: player.position,
              nationality: "Moroccan",
            },
          });

          await this.prisma.client.playerSeason.create({
            data: {
              playerId: dbPlayer.id,
              seasonId: activeSeason.id,
              clubId,
              status: "AVAILABLE",
              pricePoints: player.priceTenths,
            },
          });

          playerMapping = await this.prisma.client.providerEntityMapping.create(
            {
              data: {
                provider: providerName,
                entityType: "player",
                providerId: player.providerId,
                playerId: dbPlayer.id,
              },
            },
          );
          insertedCount++;
        } else {
          updatedCount++;
        }
      }

      const totalRecordCount = clubs.length + players.length;
      await this.prisma.client.ingestionRun.update({
        where: { id: run.id },
        data: {
          status: "SUCCESS",
          recordCount: totalRecordCount,
          insertedCount,
          updatedCount,
          skippedCount,
          failedCount,
          finishedAt: new Date(),
        },
      });

      return {
        ingestionRunId: run.id,
        provider: providerName,
        jobType: "clubs_players",
        status: "SUCCESS",
        insertedCount,
        updatedCount,
        skippedCount,
        failedCount,
        recordCount: totalRecordCount,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`syncClubsAndPlayers failed: ${errorMsg}`);
      await this.prisma.client.ingestionRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          errorDetail: errorMsg,
          finishedAt: new Date(),
        },
      });
      throw err;
    }
  }

  /**
   * Import deterministic mock gameweek fixtures, events, and player stats.
   */
  async ingestMockGameweek(
    gameweekNumber: number = 1,
  ): Promise<IngestionSummary> {
    const startedAt = new Date();
    const providerName = this.provider.getProviderName();
    this.logger.log(
      `Starting ingestMockGameweek for gameweek ${gameweekNumber}...`,
    );

    const activeSeason = await this.prisma.client.season.findFirst({
      where: { isActive: true },
    });
    if (!activeSeason) throw new Error("No active season found");

    const gameweek = await this.prisma.client.gameweek.findUnique({
      where: {
        seasonId_number: {
          seasonId: activeSeason.id,
          number: gameweekNumber,
        },
      },
    });

    const run = await this.prisma.client.ingestionRun.create({
      data: {
        gameweekId: gameweek?.id,
        provider: providerName,
        jobType: "mock_gameweek",
        status: "PENDING",
        startedAt,
      },
    });

    let insertedCount = 0;
    let updatedCount = 0;
    const skippedCount = 0;
    const failedCount = 0;

    try {
      const externalFixtures =
        await this.provider.fetchFixtures(gameweekNumber);
      let recordCount = externalFixtures.length;

      for (const extFix of externalFixtures) {
        let fixMapping =
          await this.prisma.client.providerEntityMapping.findUnique({
            where: {
              provider_entityType_providerId: {
                provider: providerName,
                entityType: "fixture",
                providerId: extFix.providerId,
              },
            },
          });

        let fixtureId: string;

        if (!fixMapping) {
          const homeClub = await this.prisma.client.club.findFirst({
            where: { seasonId: activeSeason.id },
            orderBy: { name: "asc" },
          });
          const awayClub = await this.prisma.client.club.findFirst({
            where: { seasonId: activeSeason.id },
            orderBy: { name: "desc" },
          });

          const createdFix = await this.prisma.client.fixture.create({
            data: {
              gameweekId: gameweek?.id || `gw-2024-25-${gameweekNumber}`,
              homeClubId: homeClub!.id,
              awayClubId: awayClub!.id,
              status: extFix.status,
              kickoffUtc: new Date(extFix.kickoffTimeUtc),
              homeScore: extFix.homeScore ?? null,
              awayScore: extFix.awayScore ?? null,
              venue: extFix.venue || "Stade Prince Moulay Abdellah",
            },
          });

          fixMapping = await this.prisma.client.providerEntityMapping.upsert({
            where: {
              provider_entityType_providerId: {
                provider: providerName,
                entityType: "fixture",
                providerId: extFix.providerId,
              },
            },
            create: {
              provider: providerName,
              entityType: "fixture",
              providerId: extFix.providerId,
              fixtureId: createdFix.id,
            },
            update: {
              fixtureId: createdFix.id,
            },
          });
          fixtureId = createdFix.id;
          insertedCount++;
        } else {
          fixtureId = fixMapping.fixtureId!;
          await this.prisma.client.fixture.update({
            where: { id: fixtureId },
            data: {
              status: extFix.status,
              homeScore: extFix.homeScore ?? null,
              awayScore: extFix.awayScore ?? null,
            },
          });
          updatedCount++;
        }

        // Import match events
        const events = await this.provider.fetchMatchEvents(extFix.providerId);
        recordCount += events.length;
        for (const evt of events) {
          const existingEvt = await this.prisma.client.fixtureEvent.findFirst({
            where: { fixtureId, minute: evt.minute, type: evt.type },
          });
          if (!existingEvt) {
            await this.prisma.client.fixtureEvent.create({
              data: {
                fixtureId,
                minute: evt.minute,
                type: evt.type,
                detail: evt.detail,
              },
            });
            insertedCount++;
          } else {
            updatedCount++;
          }
        }

        // Import player fixture statistics
        const stats = await this.provider.fetchPlayerFixtureStats(
          extFix.providerId,
        );
        recordCount += stats.length;
        const playerSeasons = await this.prisma.client.playerSeason.findMany({
          where: { seasonId: activeSeason.id },
          take: stats.length,
        });

        for (const [idx, stat] of stats.entries()) {
          const ps = playerSeasons[idx % playerSeasons.length];
          if (!ps) continue;

          const existingStat =
            await this.prisma.client.playerFixtureStats.findUnique({
              where: {
                playerSeasonId_fixtureId: {
                  playerSeasonId: ps.id,
                  fixtureId,
                },
              },
            });

          await this.prisma.client.playerFixtureStats.upsert({
            where: {
              playerSeasonId_fixtureId: {
                playerSeasonId: ps.id,
                fixtureId,
              },
            },
            create: {
              playerSeasonId: ps.id,
              fixtureId,
              minutesPlayed: stat.minutesPlayed,
              goals: stat.goals,
              assists: stat.assists,
              cleanSheet: stat.cleanSheet,
              yellowCards: stat.yellowCards,
              redCards: stat.redCards,
              saves: stat.saves,
              penaltySaves: stat.penaltySaves,
              penaltyMisses: stat.penaltyMisses,
              ownGoals: stat.ownGoals,
              goalsConceded: stat.goalsConceded,
            },
            update: {
              minutesPlayed: stat.minutesPlayed,
              goals: stat.goals,
              assists: stat.assists,
              cleanSheet: stat.cleanSheet,
              yellowCards: stat.yellowCards,
              redCards: stat.redCards,
              saves: stat.saves,
              penaltySaves: stat.penaltySaves,
              penaltyMisses: stat.penaltyMisses,
              ownGoals: stat.ownGoals,
              goalsConceded: stat.goalsConceded,
            },
          });

          if (existingStat) {
            updatedCount++;
          } else {
            insertedCount++;
          }
        }
      }

      await this.prisma.client.ingestionRun.update({
        where: { id: run.id },
        data: {
          status: "SUCCESS",
          recordCount,
          insertedCount,
          updatedCount,
          skippedCount,
          failedCount,
          finishedAt: new Date(),
        },
      });

      return {
        ingestionRunId: run.id,
        provider: providerName,
        jobType: "mock_gameweek",
        status: "SUCCESS",
        insertedCount,
        updatedCount,
        skippedCount,
        failedCount,
        recordCount,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`ingestMockGameweek failed: ${errorMsg}`);
      await this.prisma.client.ingestionRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          errorDetail: errorMsg,
          finishedAt: new Date(),
        },
      });
      throw err;
    }
  }
}
