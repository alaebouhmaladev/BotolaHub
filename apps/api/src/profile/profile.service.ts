import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@botolahub/database';
import { CompleteOnboardingDto, UpdateProfileDto } from '@botolahub/contracts';

@Injectable()
export class ProfileService {
  async checkUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
    const normalized = username.toLowerCase().trim();
    const existing = await prisma.userProfile.findFirst({
      where: {
        username: { equals: normalized, mode: 'insensitive' },
        ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
      },
    });
    return !existing;
  }

  async completeOnboarding(userId: string, dto: CompleteOnboardingDto) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.isProfileCompleted) {
      throw new BadRequestException('User profile has already been completed');
    }

    const available = await this.checkUsernameAvailable(dto.username);
    if (!available) {
      throw new ConflictException(`Username '${dto.username}' is already taken`);
    }

    const club = await prisma.club.findUnique({ where: { id: dto.favoriteClubId } });
    if (!club) {
      throw new NotFoundException(`Favorite club with ID ${dto.favoriteClubId} not found`);
    }

    // Minimum age 13 validation
    const birthDate = new Date(dto.birthDate);
    const age = (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (age < 13) {
      throw new BadRequestException('User must be at least 13 years old');
    }

    const profile = await prisma.$transaction(async (tx) => {
      const createdProfile = await tx.userProfile.create({
        data: {
          userId,
          username: dto.username.trim(),
          displayName: dto.displayName.trim(),
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          birthDate,
          city: dto.city.trim(),
          favoriteClubId: dto.favoriteClubId,
          avatarUrl: dto.avatarUrl,
          phoneNumber: dto.phoneNumber,
        },
        include: { favoriteClub: true },
      });

      await tx.user.update({
        where: { id: userId },
        data: { isProfileCompleted: true },
      });

      await tx.userFavoriteClubHistory.create({
        data: {
          userId,
          clubId: dto.favoriteClubId,
          effectiveFromGameweek: 1,
        },
      });

      return createdProfile;
    });

    return profile;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const currentProfile = await prisma.userProfile.findUnique({ where: { userId } });
    if (!currentProfile) {
      throw new NotFoundException('User profile not found. Please complete onboarding first.');
    }

    if (dto.username && dto.username.toLowerCase() !== currentProfile.username.toLowerCase()) {
      const available = await this.checkUsernameAvailable(dto.username, userId);
      if (!available) {
        throw new ConflictException(`Username '${dto.username}' is already taken`);
      }
    }

    let favoriteClubChanged = false;
    if (dto.favoriteClubId && dto.favoriteClubId !== currentProfile.favoriteClubId) {
      const club = await prisma.club.findUnique({ where: { id: dto.favoriteClubId } });
      if (!club) {
        throw new NotFoundException(`Favorite club with ID ${dto.favoriteClubId} not found`);
      }
      favoriteClubChanged = true;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.userProfile.update({
        where: { userId },
        data: {
          ...(dto.username ? { username: dto.username.trim() } : {}),
          ...(dto.displayName ? { displayName: dto.displayName.trim() } : {}),
          ...(dto.firstName ? { firstName: dto.firstName.trim() } : {}),
          ...(dto.lastName ? { lastName: dto.lastName.trim() } : {}),
          ...(dto.birthDate ? { birthDate: new Date(dto.birthDate) } : {}),
          ...(dto.city ? { city: dto.city.trim() } : {}),
          ...(dto.favoriteClubId ? { favoriteClubId: dto.favoriteClubId } : {}),
          ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
          ...(dto.phoneNumber !== undefined ? { phoneNumber: dto.phoneNumber } : {}),
        },
        include: { favoriteClub: true },
      });

      if (favoriteClubChanged && dto.favoriteClubId) {
        await tx.userFavoriteClubHistory.create({
          data: {
            userId,
            clubId: dto.favoriteClubId,
            effectiveFromGameweek: null,
          },
        });
      }

      return p;
    });

    return updated;
  }
}
