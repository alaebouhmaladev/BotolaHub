import { Controller, Post, Patch, Get, Body, Req, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProfileService } from './profile.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import {
  CompleteOnboardingDto,
  CompleteOnboardingDtoSchema,
  UpdateProfileDto,
  UpdateProfileDtoSchema,
} from '@botolahub/contracts';

@ApiTags('Profile')
@Controller('api/v1/profile')
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @Get('check-username')
  @ApiOperation({ summary: 'Check if a username is available' })
  async checkUsername(@Query('username') username: string) {
    const isAvailable = await this.profileService.checkUsernameAvailable(username || '');
    return { username, isAvailable };
  }

  @Post('onboarding')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Complete mandatory onboarding profile' })
  async completeOnboarding(@Req() req: any, @Body() body: CompleteOnboardingDto) {
    const dto = CompleteOnboardingDtoSchema.parse(body);
    return this.profileService.completeOnboarding(req.user.sub, dto);
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(@Req() req: any, @Body() body: UpdateProfileDto) {
    const dto = UpdateProfileDtoSchema.parse(body);
    return this.profileService.updateProfile(req.user.sub, dto);
  }
}
