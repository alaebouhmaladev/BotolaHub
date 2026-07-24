import { Injectable, NotFoundException, Inject } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { PlayerFilterQuery } from "@botolahub/contracts";
import { Prisma } from "@botolahub/database";

@Injectable()
export class CatalogService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getActiveCompetition() {
    const comp = await this.prisma.client.competition.findFirst({
      orderBy: { createdAt: "asc" },
    });
    if (!comp) {
      throw new NotFoundException("No active competition found");
    }
    return comp;
  }

  async getActiveSeason() {
    const season = await this.prisma.client.season.findFirst({
      where: { isActive: true },
      include: { competition: true },
    });
    if (!season) {
      throw new NotFoundException("No active season found");
    }
    return season;
  }

  async getClubs() {
    const activeSeason = await this.getActiveSeason();
    return this.prisma.client.club.findMany({
      where: { seasonId: activeSeason.id },
      orderBy: { name: "asc" },
    });
  }

  async getClub(id: string) {
    const club = await this.prisma.client.club.findUnique({
      where: { id },
    });
    if (!club) {
      throw new NotFoundException(`Club with ID ${id} not found`);
    }
    return club;
  }

  async getPlayers(query: PlayerFilterQuery) {
    const activeSeason = await this.getActiveSeason();
    const page = query.page || 1;
    const limit = Math.min(query.limit || 50, 250);
    const skip = (page - 1) * limit;

    const where: Prisma.PlayerSeasonWhereInput = {
      seasonId: activeSeason.id,
    };

    if (query.clubId) {
      where.clubId = query.clubId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.pricePoints = {};
      if (query.minPrice !== undefined) where.pricePoints.gte = query.minPrice;
      if (query.maxPrice !== undefined) where.pricePoints.lte = query.maxPrice;
    }

    const playerConditions: Prisma.PlayerWhereInput = {};
    if (query.position) {
      playerConditions.position = query.position;
    }
    if (query.search) {
      const search = query.search.trim();
      playerConditions.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { firstNameAr: { contains: search, mode: "insensitive" } },
        { lastNameAr: { contains: search, mode: "insensitive" } },
      ];
    }
    if (Object.keys(playerConditions).length > 0) {
      where.player = playerConditions;
    }

    const [items, total] = await Promise.all([
      this.prisma.client.playerSeason.findMany({
        where,
        include: {
          player: true,
          club: true,
        },
        orderBy: [{ pricePoints: "desc" }, { player: { lastName: "asc" } }],
        skip,
        take: limit,
      }),
      this.prisma.client.playerSeason.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getPlayer(id: string) {
    const playerSeason = await this.prisma.client.playerSeason.findUnique({
      where: { id },
      include: {
        player: true,
        club: true,
      },
    });
    if (!playerSeason) {
      throw new NotFoundException(`Player with ID ${id} not found`);
    }
    return playerSeason;
  }

  async getGameweeks() {
    const activeSeason = await this.getActiveSeason();
    return this.prisma.client.gameweek.findMany({
      where: { seasonId: activeSeason.id },
      orderBy: { number: "asc" },
    });
  }

  async getActiveGameweek() {
    const activeSeason = await this.getActiveSeason();
    let gw = await this.prisma.client.gameweek.findFirst({
      where: { seasonId: activeSeason.id, status: "ACTIVE" },
    });
    if (!gw) {
      gw = await this.prisma.client.gameweek.findFirst({
        where: { seasonId: activeSeason.id },
        orderBy: { number: "asc" },
      });
    }
    if (!gw) {
      throw new NotFoundException("No active gameweek found");
    }
    return gw;
  }

  async getFixtures() {
    const activeSeason = await this.getActiveSeason();
    return this.prisma.client.fixture.findMany({
      where: {
        gameweek: {
          seasonId: activeSeason.id,
        },
      },
      include: {
        homeClub: true,
        awayClub: true,
      },
      orderBy: { kickoffUtc: "asc" },
    });
  }
}
