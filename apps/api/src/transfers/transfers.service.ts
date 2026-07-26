import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import {
  TransferPreviewDto,
  TransferPreviewResult,
  TransferConfirmDto,
  TransferConfirmResult,
  TransferHistoryItem,
} from "@botolahub/contracts";
import {
  validateSquad,
  calculateTransferDeduction,
  isDeadlineLocked,
  PlayerData,
  SquadPlayerInput,
  INITIAL_BUDGET_TENTHS,
} from "@botolahub/fantasy-engine";

@Injectable()
export class TransfersService {
  private readonly logger = new Logger(TransfersService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private async getActiveGameweek() {
    const activeSeason = await this.prisma.client.season.findFirst({
      where: { isActive: true },
    });
    if (!activeSeason) throw new BadRequestException("No active season found");

    let gw = await this.prisma.client.gameweek.findFirst({
      where: { seasonId: activeSeason.id, status: "ACTIVE" },
    });
    if (!gw) {
      gw = await this.prisma.client.gameweek.findFirst({
        where: { seasonId: activeSeason.id },
        orderBy: { number: "asc" },
      });
    }
    if (!gw) throw new BadRequestException("No active gameweek found");
    return gw;
  }

  private async getUserFantasyTeam(userId: string) {
    const activeSeason = await this.prisma.client.season.findFirst({
      where: { isActive: true },
    });
    if (!activeSeason) throw new NotFoundException("No active season found");

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
      },
    });

    if (!team) {
      throw new NotFoundException("User does not have a fantasy team");
    }
    return team;
  }

  async preview(
    userId: string,
    dto: TransferPreviewDto,
  ): Promise<TransferPreviewResult> {
    const team = await this.getUserFantasyTeam(userId);
    const gameweek = await this.getActiveGameweek();

    // Check deadline
    if (isDeadlineLocked(gameweek.deadlineUtc, new Date())) {
      return {
        isValid: false,
        transfersCount: dto.transfers.length,
        freeTransfersAvailable: 1,
        paidTransfersCount: dto.transfers.length,
        deductionPoints: dto.transfers.length * 4,
        costDifferenceTenths: 0,
        newBudgetPoints: team.budgetPoints,
        issues: [
          {
            code: "DEADLINE_LOCKED",
            message: "Gameweek transfer deadline has passed",
            field: "deadlineUtc",
          },
        ],
      };
    }

    const currentSquadPlayerIds = new Set(
      team.squadMembers.map((m) => m.playerSeasonId),
    );

    // Validate outgoing/incoming pairs
    for (const pair of dto.transfers) {
      if (!currentSquadPlayerIds.has(pair.outgoingPlayerSeasonId)) {
        throw new BadRequestException(
          `Outgoing player ${pair.outgoingPlayerSeasonId} is not in your current squad`,
        );
      }
      if (pair.outgoingPlayerSeasonId === pair.incomingPlayerSeasonId) {
        throw new BadRequestException(
          `Cannot transfer in and out the same player (${pair.outgoingPlayerSeasonId})`,
        );
      }
    }

    // Fetch authoritative prices & data for incoming & outgoing players from DB
    const allRequestedPlayerIds = Array.from(
      new Set(
        dto.transfers.flatMap((t) => [
          t.outgoingPlayerSeasonId,
          t.incomingPlayerSeasonId,
        ]),
      ),
    );

    const playerSeasons = await this.prisma.client.playerSeason.findMany({
      where: { id: { in: allRequestedPlayerIds } },
      include: { player: true, club: true },
    });

    const dbPlayerMap = new Map(playerSeasons.map((ps) => [ps.id, ps]));

    // Construct proposed new squad
    const outgoingSet = new Set(
      dto.transfers.map((t) => t.outgoingPlayerSeasonId),
    );
    const incomingIds = dto.transfers.map((t) => t.incomingPlayerSeasonId);

    const newSquadPlayerIds = [
      ...team.squadMembers
        .map((m) => m.playerSeasonId)
        .filter((id) => !outgoingSet.has(id)),
      ...incomingIds,
    ];

    // Build complete player catalog map for squad validation
    const allSquadPlayerSeasons =
      await this.prisma.client.playerSeason.findMany({
        where: { id: { in: newSquadPlayerIds } },
        include: { player: true, club: true },
      });

    const squadPlayerMap = new Map<string, PlayerData>();
    const squadInputs: SquadPlayerInput[] = [];

    let totalOutgoingCost = 0;
    let totalIncomingCost = 0;

    for (const pair of dto.transfers) {
      const outPs = dbPlayerMap.get(pair.outgoingPlayerSeasonId);
      const inPs = dbPlayerMap.get(pair.incomingPlayerSeasonId);

      if (!outPs || !inPs) {
        throw new BadRequestException("One or more players not found");
      }
      totalOutgoingCost += outPs.pricePoints;
      totalIncomingCost += inPs.pricePoints;
    }

    for (const ps of allSquadPlayerSeasons) {
      squadPlayerMap.set(ps.id, {
        playerSeasonId: ps.id,
        position: ps.player.position,
        clubId: ps.clubId,
      });
      squadInputs.push({ playerSeasonId: ps.id, pricePoints: ps.pricePoints });
    }

    const costDifferenceTenths = totalIncomingCost - totalOutgoingCost;
    const newBudgetPoints = team.budgetPoints - costDifferenceTenths;

    // Validate squad against rules & 100.0 credit budget limit
    const validation = validateSquad(
      squadInputs,
      squadPlayerMap,
      INITIAL_BUDGET_TENTHS,
    );

    // Calculate free transfers and deduction
    const existingTransfersCount = await this.prisma.client.transfer.count({
      where: {
        fantasyTeamId: team.id,
        gameweekId: gameweek.id,
      },
    });

    // 1 free transfer per gameweek
    const freeTransfersAvailable = Math.max(
      0,
      1 - Math.floor(existingTransfersCount / 2),
    );
    const { deductionPoints, paidTransfersCount } = calculateTransferDeduction(
      dto.transfers.length,
      freeTransfersAvailable,
    );

    return {
      isValid: validation.isValid && newBudgetPoints >= 0,
      transfersCount: dto.transfers.length,
      freeTransfersAvailable,
      paidTransfersCount,
      deductionPoints,
      costDifferenceTenths,
      newBudgetPoints,
      issues: validation.issues,
    };
  }

  async confirm(
    userId: string,
    dto: TransferConfirmDto,
  ): Promise<TransferConfirmResult> {
    const team = await this.getUserFantasyTeam(userId);

    // Check idempotency key if provided
    const idempotencyKey =
      dto.idempotencyKey || `tr-key-${userId}-${Date.now()}`;
    const existingTransfers = await this.prisma.client.transfer.findMany({
      where: {
        fantasyTeamId: team.id,
        transferGroupKey: idempotencyKey,
      },
    });

    if (existingTransfers.length > 0) {
      const squad = await this.prisma.client.fantasySquadMember.findMany({
        where: { fantasyTeamId: team.id },
        include: { playerSeason: { include: { player: true, club: true } } },
      });
      return {
        success: true,
        transfersCount: dto.transfers.length,
        deductionPoints: existingTransfers[0].deductionPoints,
        remainingBudgetPoints: team.budgetPoints,
        transferGroupKey: idempotencyKey,
        squad,
      };
    }

    // Run preview check first
    const previewRes = await this.preview(userId, dto);
    if (!previewRes.isValid) {
      this.logger.error(
        `Confirm transfer preview failed: ${JSON.stringify(previewRes)}`,
      );
      throw new BadRequestException(
        previewRes.issues[0]?.message || "Transfer validation failed",
      );
    }

    const gameweek = await this.getActiveGameweek();

    // Execute atomic transaction
    return await this.prisma.client.$transaction(async (tx) => {
      // 1. Re-check deadline in transaction
      const currentGw = await tx.gameweek.findUnique({
        where: { id: gameweek.id },
      });
      if (!currentGw || isDeadlineLocked(currentGw.deadlineUtc, new Date())) {
        throw new BadRequestException("Gameweek transfer deadline has passed");
      }

      // 2. Process outgoing & incoming players
      let budgetAdjustment = 0;

      for (const pair of dto.transfers) {
        const outPs = await tx.playerSeason.findUnique({
          where: { id: pair.outgoingPlayerSeasonId },
        });
        const inPs = await tx.playerSeason.findUnique({
          where: { id: pair.incomingPlayerSeasonId },
        });

        if (!outPs || !inPs) {
          throw new BadRequestException("Player not found in database");
        }

        // Delete outgoing squad member
        await tx.fantasySquadMember.deleteMany({
          where: {
            fantasyTeamId: team.id,
            playerSeasonId: pair.outgoingPlayerSeasonId,
          },
        });

        // Add incoming squad member
        await tx.fantasySquadMember.create({
          data: {
            fantasyTeamId: team.id,
            playerSeasonId: pair.incomingPlayerSeasonId,
            purchasePrice: inPs.pricePoints,
          },
        });

        // Record Transfer audit entries
        await tx.transfer.create({
          data: {
            fantasyTeamId: team.id,
            gameweekId: gameweek.id,
            transferGroupKey: idempotencyKey,
            type: "OUT",
            playerSeasonId: pair.outgoingPlayerSeasonId,
            outgoingPlayerSeasonId: pair.outgoingPlayerSeasonId,
            incomingPlayerSeasonId: pair.incomingPlayerSeasonId,
            pricePoints: outPs.pricePoints,
            pointsCost: 0,
            deductionPoints: previewRes.deductionPoints,
          },
        });

        await tx.transfer.create({
          data: {
            fantasyTeamId: team.id,
            gameweekId: gameweek.id,
            transferGroupKey: idempotencyKey,
            type: "IN",
            playerSeasonId: pair.incomingPlayerSeasonId,
            outgoingPlayerSeasonId: pair.outgoingPlayerSeasonId,
            incomingPlayerSeasonId: pair.incomingPlayerSeasonId,
            pricePoints: inPs.pricePoints,
            pointsCost: previewRes.deductionPoints,
            deductionPoints: previewRes.deductionPoints,
          },
        });

        budgetAdjustment += inPs.pricePoints - outPs.pricePoints;
      }

      // 3. Update team budget
      const updatedTeam = await tx.fantasyTeam.update({
        where: { id: team.id },
        data: {
          budgetPoints: {
            decrement: budgetAdjustment,
          },
        },
      });

      // 4. Update lineup if outgoing player was in starting or bench
      const currentLineup = await tx.gameweekLineup.findUnique({
        where: {
          fantasyTeamId_gameweekId: {
            fantasyTeamId: team.id,
            gameweekId: gameweek.id,
          },
        },
        include: { players: true },
      });

      if (currentLineup) {
        for (const pair of dto.transfers) {
          const lineupPlayer = currentLineup.players.find(
            (p) => p.playerSeasonId === pair.outgoingPlayerSeasonId,
          );
          if (lineupPlayer) {
            await tx.gameweekLineupPlayer.delete({
              where: { id: lineupPlayer.id },
            });
            await tx.gameweekLineupPlayer.create({
              data: {
                lineupId: currentLineup.id,
                playerSeasonId: pair.incomingPlayerSeasonId,
                isStarting: lineupPlayer.isStarting,
                benchOrder: lineupPlayer.benchOrder,
              },
            });

            // Update captain/vice-captain if affected
            let newCaptain = currentLineup.captainId;
            let newViceCaptain = currentLineup.viceCaptainId;
            if (currentLineup.captainId === pair.outgoingPlayerSeasonId) {
              newCaptain = pair.incomingPlayerSeasonId;
            }
            if (currentLineup.viceCaptainId === pair.outgoingPlayerSeasonId) {
              newViceCaptain = pair.incomingPlayerSeasonId;
            }
            await tx.gameweekLineup.update({
              where: { id: currentLineup.id },
              data: { captainId: newCaptain, viceCaptainId: newViceCaptain },
            });
          }
        }
      }

      const finalSquad = await tx.fantasySquadMember.findMany({
        where: { fantasyTeamId: team.id },
        include: { playerSeason: { include: { player: true, club: true } } },
      });

      return {
        success: true,
        transfersCount: dto.transfers.length,
        deductionPoints: previewRes.deductionPoints,
        remainingBudgetPoints: updatedTeam.budgetPoints,
        transferGroupKey: idempotencyKey,
        squad: finalSquad,
      };
    });
  }

  async getHistory(userId: string): Promise<TransferHistoryItem[]> {
    const team = await this.getUserFantasyTeam(userId);

    const items = await this.prisma.client.transfer.findMany({
      where: { fantasyTeamId: team.id },
      include: {
        playerSeason: {
          include: { player: true, club: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return items.map((i) => ({
      ...i,
      createdAt: i.createdAt.toISOString(),
    }));
  }
}
