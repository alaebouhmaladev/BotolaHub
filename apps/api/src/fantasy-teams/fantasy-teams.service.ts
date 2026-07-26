import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnprocessableEntityException,
  Inject,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { CatalogService } from "../catalog/catalog.service.js";
import {
  validateSquad,
  validateStartingLineup,
  validateBench,
  validateCaptaincy,
  PlayerData,
  INITIAL_BUDGET_TENTHS,
  isDeadlineLocked,
} from "@botolahub/fantasy-engine";
import {
  CreateFantasyTeamDto,
  UpdateSquadDto,
  UpdateLineupDto,
} from "@botolahub/contracts";

@Injectable()
export class FantasyTeamService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CatalogService) private readonly catalogService: CatalogService,
  ) {}

  async createTeam(userId: string, dto: CreateFantasyTeamDto) {
    const activeSeason = await this.catalogService.getActiveSeason();

    const existing = await this.prisma.client.fantasyTeam.findUnique({
      where: {
        userId_seasonId: {
          userId,
          seasonId: activeSeason.id,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        "User already owns a fantasy team for this season",
      );
    }

    return this.prisma.client.fantasyTeam.create({
      data: {
        userId,
        seasonId: activeSeason.id,
        name: dto.name.trim(),
        budgetPoints: INITIAL_BUDGET_TENTHS,
        totalPoints: 0,
      },
      include: {
        squadMembers: true,
        gameweekLineups: true,
      },
    });
  }

  async getMyTeam(userId: string) {
    const activeSeason = await this.catalogService.getActiveSeason();

    const team = await this.prisma.client.fantasyTeam.findUnique({
      where: {
        userId_seasonId: {
          userId,
          seasonId: activeSeason.id,
        },
      },
      include: {
        squadMembers: {
          include: {
            playerSeason: {
              include: {
                player: true,
                club: true,
              },
            },
          },
        },
        gameweekLineups: {
          include: {
            players: {
              include: {
                playerSeason: {
                  include: {
                    player: true,
                    club: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundException("No fantasy team found for active season");
    }

    return team;
  }

  async getTeamById(id: string) {
    const team = await this.prisma.client.fantasyTeam.findUnique({
      where: { id },
      include: {
        squadMembers: {
          include: {
            playerSeason: {
              include: {
                player: true,
                club: true,
              },
            },
          },
        },
        gameweekLineups: {
          include: {
            players: {
              include: {
                playerSeason: {
                  include: {
                    player: true,
                    club: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundException(`Fantasy team ${id} not found`);
    }

    return team;
  }

  async updateSquad(userId: string, teamId: string, dto: UpdateSquadDto) {
    const team = await this.prisma.client.fantasyTeam.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException(`Fantasy team ${teamId} not found`);
    }

    if (team.userId !== userId) {
      throw new ForbiddenException("Cannot update another user's fantasy team");
    }

    // Deadline check
    const activeGameweek = await this.catalogService.getActiveGameweek();
    if (isDeadlineLocked(activeGameweek.deadlineUtc, new Date())) {
      throw new UnprocessableEntityException({
        message: "Gameweek deadline has passed. Squad changes are locked.",
        error: {
          code: "DEADLINE_LOCKED",
          issues: [
            {
              code: "DEADLINE_LOCKED",
              message: "Gameweek deadline has passed.",
            },
          ],
        },
      });
    }

    // Re-read authoritative prices and positions from DB
    const dbPlayers = await this.prisma.client.playerSeason.findMany({
      where: {
        id: { in: dto.squadPlayerIds },
        seasonId: team.seasonId,
      },
      include: {
        player: true,
      },
    });

    if (dbPlayers.length !== dto.squadPlayerIds.length) {
      throw new BadRequestException(
        "One or more player IDs are invalid or belong to a different season",
      );
    }

    const playerMap = new Map<string, PlayerData>();
    const squadInputs = dbPlayers.map((p) => {
      playerMap.set(p.id, {
        playerSeasonId: p.id,
        position: p.player.position,
        clubId: p.clubId,
      });
      return {
        playerSeasonId: p.id,
        pricePoints: p.pricePoints,
      };
    });

    // Run pure fantasy engine validation
    const validation = validateSquad(squadInputs, playerMap);
    if (!validation.isValid) {
      throw new UnprocessableEntityException({
        message: "Squad validation failed",
        error: {
          code: validation.issues[0]?.code || "SQUAD_SIZE_INVALID",
          issues: validation.issues,
        },
      });
    }

    const totalCost = squadInputs.reduce((sum, p) => sum + p.pricePoints, 0);
    const remainingBudget = INITIAL_BUDGET_TENTHS - totalCost;

    // Atomic transaction
    await this.prisma.client.$transaction(async (tx) => {
      await tx.fantasySquadMember.deleteMany({
        where: { fantasyTeamId: teamId },
      });

      await tx.fantasySquadMember.createMany({
        data: squadInputs.map((p) => ({
          fantasyTeamId: teamId,
          playerSeasonId: p.playerSeasonId,
          purchasePrice: p.pricePoints,
        })),
      });

      await tx.fantasyTeam.update({
        where: { id: teamId },
        data: { budgetPoints: remainingBudget },
      });
    });

    return this.getTeamById(teamId);
  }

  async updateLineup(userId: string, teamId: string, dto: UpdateLineupDto) {
    const team = await this.prisma.client.fantasyTeam.findUnique({
      where: { id: teamId },
      include: {
        squadMembers: {
          include: {
            playerSeason: {
              include: {
                player: true,
              },
            },
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundException(`Fantasy team ${teamId} not found`);
    }

    if (team.userId !== userId) {
      throw new ForbiddenException("Cannot update another user's fantasy team");
    }

    const activeGameweek = await this.catalogService.getActiveGameweek();
    if (isDeadlineLocked(activeGameweek.deadlineUtc, new Date())) {
      throw new UnprocessableEntityException({
        message: "Gameweek deadline has passed. Lineup changes are locked.",
        error: {
          code: "DEADLINE_LOCKED",
          issues: [
            {
              code: "DEADLINE_LOCKED",
              message: "Gameweek deadline has passed.",
            },
          ],
        },
      });
    }

    const squadPlayerIds = team.squadMembers.map((m) => m.playerSeasonId);
    const playerMap = new Map<string, PlayerData>();

    team.squadMembers.forEach((m) => {
      playerMap.set(m.playerSeasonId, {
        playerSeasonId: m.playerSeasonId,
        position: m.playerSeason.player.position,
        clubId: m.playerSeason.clubId,
      });
    });

    const lineupRes = validateStartingLineup(
      dto.startingPlayerIds,
      squadPlayerIds,
      playerMap,
    );
    const benchRes = validateBench(
      dto.benchPlayerIds,
      squadPlayerIds,
      dto.startingPlayerIds,
    );
    const captainRes = validateCaptaincy(
      dto.captainId,
      dto.viceCaptainId,
      dto.startingPlayerIds,
    );

    const allIssues = [
      ...lineupRes.issues,
      ...benchRes.issues,
      ...captainRes.issues,
    ];

    if (allIssues.length > 0) {
      throw new UnprocessableEntityException({
        message: "Lineup validation failed",
        error: {
          code: allIssues[0].code,
          issues: allIssues,
        },
      });
    }

    // Atomic transaction
    await this.prisma.client.$transaction(async (tx) => {
      const lineup = await tx.gameweekLineup.upsert({
        where: {
          fantasyTeamId_gameweekId: {
            fantasyTeamId: teamId,
            gameweekId: activeGameweek.id,
          },
        },
        create: {
          fantasyTeamId: teamId,
          gameweekId: activeGameweek.id,
          captainId: dto.captainId,
          viceCaptainId: dto.viceCaptainId,
        },
        update: {
          captainId: dto.captainId,
          viceCaptainId: dto.viceCaptainId,
        },
      });

      await tx.gameweekLineupPlayer.deleteMany({
        where: { lineupId: lineup.id },
      });

      const starterData = dto.startingPlayerIds.map((pId) => ({
        lineupId: lineup.id,
        playerSeasonId: pId,
        isStarting: true,
        benchOrder: null,
      }));

      const benchData = dto.benchPlayerIds.map((pId, idx) => ({
        lineupId: lineup.id,
        playerSeasonId: pId,
        isStarting: false,
        benchOrder: idx,
      }));

      await tx.gameweekLineupPlayer.createMany({
        data: [...starterData, ...benchData],
      });
    });

    return this.getTeamById(teamId);
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
