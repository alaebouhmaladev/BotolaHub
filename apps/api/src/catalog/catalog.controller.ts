import {
  Controller,
  Get,
  Param,
  Query,
  Inject,
} from "@nestjs/common";
import { CatalogService } from "./catalog.service.js";
import {
  PlayerFilterQuerySchema,
} from "@botolahub/contracts";

@Controller()
export class CatalogController {
  constructor(
    @Inject(CatalogService) private readonly catalogService: CatalogService,
  ) {}

  @Get("competitions/active")
  async getActiveCompetition() {
    const data = await this.catalogService.getActiveCompetition();
    return { data };
  }

  @Get("seasons/active")
  async getActiveSeason() {
    const data = await this.catalogService.getActiveSeason();
    return { data };
  }

  @Get("clubs")
  async getClubs() {
    const data = await this.catalogService.getClubs();
    return { data };
  }

  @Get("clubs/:id")
  async getClub(@Param("id") id: string) {
    const data = await this.catalogService.getClub(id);
    return { data };
  }

  @Get("players")
  async getPlayers(@Query() rawQuery: Record<string, string>) {
    const parsedQuery = PlayerFilterQuerySchema.parse(rawQuery);
    const data = await this.catalogService.getPlayers(parsedQuery);
    return { data };
  }

  @Get("players/:id")
  async getPlayer(@Param("id") id: string) {
    const data = await this.catalogService.getPlayer(id);
    return { data };
  }

  @Get("gameweeks")
  async getGameweeks() {
    const data = await this.catalogService.getGameweeks();
    return { data };
  }

  @Get("gameweeks/active")
  async getActiveGameweek() {
    const data = await this.catalogService.getActiveGameweek();
    return { data };
  }

  @Get("fixtures")
  async getFixtures() {
    const data = await this.catalogService.getFixtures();
    return { data };
  }
}
