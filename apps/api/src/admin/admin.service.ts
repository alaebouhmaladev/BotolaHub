import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { prisma } from '@botolahub/database';
import { CreateClubDto, CreateSeasonDto } from '@botolahub/contracts';

@Injectable()
export class AdminService {
  async createClub(
    adminUserId: string,
    dto: CreateClubDto,
    requestId?: string,
    ipAddress?: string,
  ) {
    const existing = await prisma.club.findUnique({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`Club with code '${dto.code}' already exists`);
    }

    const { auditReason, ...clubData } = dto;

    const club = await prisma.$transaction(async (tx) => {
      const created = await tx.club.create({
        data: clubData,
      });

      await tx.adminAuditLog.create({
        data: {
          adminUserId,
          action: 'CREATE_CLUB',
          targetResource: 'Club',
          targetId: created.id,
          afterValue: JSON.stringify(created),
          auditReason: auditReason || 'Admin created new club',
          requestId,
          ipAddress,
        },
      });

      return created;
    });

    return club;
  }

  async updateClub(
    adminUserId: string,
    clubId: string,
    dto: Partial<CreateClubDto>,
    requestId?: string,
    ipAddress?: string,
  ) {
    const existing = await prisma.club.findUnique({ where: { id: clubId } });
    if (!existing) {
      throw new NotFoundException(`Club with ID '${clubId}' not found`);
    }

    const { auditReason, ...updateData } = dto;

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.club.update({
        where: { id: clubId },
        data: updateData,
      });

      await tx.adminAuditLog.create({
        data: {
          adminUserId,
          action: 'UPDATE_CLUB',
          targetResource: 'Club',
          targetId: clubId,
          beforeValue: JSON.stringify(existing),
          afterValue: JSON.stringify(result),
          auditReason: auditReason || 'Admin updated club',
          requestId,
          ipAddress,
        },
      });

      return result;
    });

    return updated;
  }

  async createSeason(
    adminUserId: string,
    dto: CreateSeasonDto,
    requestId?: string,
    ipAddress?: string,
  ) {
    const { auditReason, ...seasonData } = dto;

    const season = await prisma.$transaction(async (tx) => {
      const created = await tx.season.create({
        data: {
          competitionId: seasonData.competitionId,
          name: seasonData.name,
          year: seasonData.year,
          startDate: new Date(seasonData.startDate),
          endDate: new Date(seasonData.endDate),
          isActive: seasonData.isActive,
        },
      });

      await tx.adminAuditLog.create({
        data: {
          adminUserId,
          action: 'CREATE_SEASON',
          targetResource: 'Season',
          targetId: created.id,
          afterValue: JSON.stringify(created),
          auditReason: auditReason || 'Admin created season',
          requestId,
          ipAddress,
        },
      });

      return created;
    });

    return season;
  }

  async getAuditLogs(limit = 50) {
    return prisma.adminAuditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        adminUser: {
          select: { id: true, email: true },
        },
      },
    });
  }
}
