import { Injectable } from '@nestjs/common';
import { prisma } from '@botolahub/database';

@Injectable()
export class CatalogService {
  async getClubs() {
    return prisma.club.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getCompetitions() {
    return prisma.competition.findMany({
      include: { seasons: true },
      orderBy: { name: 'asc' },
    });
  }

  async getSeasons() {
    return prisma.season.findMany({
      include: { competition: true },
      orderBy: { startDate: 'desc' },
    });
  }
}
