import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Req,
  UseGuards,
  Inject,
} from "@nestjs/common";
import { FantasyTeamService } from "./fantasy-teams.service.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import {
  CreateFantasyTeamDtoSchema,
  UpdateSquadDtoSchema,
  UpdateLineupDtoSchema,
} from "@botolahub/contracts";
import { FastifyRequest } from "fastify";

interface AuthenticatedRequest extends FastifyRequest {
  user: {
    sub: string;
    sessionId: string;
    role: string;
  };
}

@Controller("fantasy-teams")
export class FantasyTeamController {
  constructor(
    @Inject(FantasyTeamService)
    private readonly fantasyTeamService: FantasyTeamService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createTeam(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    const dto = CreateFantasyTeamDtoSchema.parse(body);
    const data = await this.fantasyTeamService.createTeam(req.user.sub, dto);
    return { data };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async getMyTeam(@Req() req: AuthenticatedRequest) {
    const data = await this.fantasyTeamService.getMyTeam(req.user.sub);
    return { data };
  }

  @Get(":id")
  async getTeamById(@Param("id") id: string) {
    const data = await this.fantasyTeamService.getTeamById(id);
    return { data };
  }

  @Put(":id/squad")
  @UseGuards(JwtAuthGuard)
  async updateSquad(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const dto = UpdateSquadDtoSchema.parse(body);
    const data = await this.fantasyTeamService.updateSquad(
      req.user.sub,
      id,
      dto,
    );
    return { data };
  }

  @Put(":id/lineup")
  @UseGuards(JwtAuthGuard)
  async updateLineup(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const dto = UpdateLineupDtoSchema.parse(body);
    const data = await this.fantasyTeamService.updateLineup(
      req.user.sub,
      id,
      dto,
    );
    return { data };
  }
}
