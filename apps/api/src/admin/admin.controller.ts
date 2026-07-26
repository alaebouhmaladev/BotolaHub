import { Controller, Post, Patch, Get, Body, Param, Req, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service.js';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards/jwt-auth.guard.js';
import { UserRole } from '@botolahub/database';
import {
  CreateClubDto,
  CreateClubDtoSchema,
  CreateSeasonDto,
  CreateSeasonDtoSchema,
} from '@botolahub/contracts';

@ApiTags('Admin')
@Controller('api/v1/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Post('clubs')
  @ApiOperation({ summary: 'Admin: Create a new club' })
  async createClub(@Req() req: any, @Body() body: CreateClubDto) {
    const dto = CreateClubDtoSchema.parse(body);
    const requestId = req.headers['x-request-id'] as string;
    return this.adminService.createClub(req.user.sub, dto, requestId, req.ip);
  }

  @Patch('clubs/:id')
  @ApiOperation({ summary: 'Admin: Update an existing club' })
  async updateClub(@Req() req: any, @Param('id') id: string, @Body() body: Partial<CreateClubDto>) {
    const requestId = req.headers['x-request-id'] as string;
    return this.adminService.updateClub(req.user.sub, id, body, requestId, req.ip);
  }

  @Post('seasons')
  @ApiOperation({ summary: 'Admin: Create a new season' })
  async createSeason(@Req() req: any, @Body() body: CreateSeasonDto) {
    const dto = CreateSeasonDtoSchema.parse(body);
    const requestId = req.headers['x-request-id'] as string;
    return this.adminService.createSeason(req.user.sub, dto, requestId, req.ip);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Admin: Get audit logs' })
  async getAuditLogs(@Query('limit') limit?: string) {
    const take = limit ? parseInt(limit, 10) : 50;
    return this.adminService.getAuditLogs(take);
  }
}
