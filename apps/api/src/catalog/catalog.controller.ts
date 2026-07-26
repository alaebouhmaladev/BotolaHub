import { Controller, Get, Param, Query, Inject } from "@nestjs/common";
import { CatalogService } from "./catalog.service.js";
import { PlayerFilterQuerySchema, FixtureStatus } from "@botolahub/contracts";

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
  async getGameweeks(@Query("seasonId") seasonId?: string) {
    const data = await this.catalogService.getGameweeks(seasonId);
    return { data };
  }

  @Get("gameweeks/active")
  async getActiveGameweek() {
    const data = await this.catalogService.getActiveGameweek();
    return { data };
  }

  @Get("gameweeks/:id")
  async getGameweek(@Param("id") id: string) {
    const data = await this.catalogService.getGameweek(id);
    return { data };
  }

  @Get("fixtures")
  async getFixtures(
    @Query("seasonId") seasonId?: string,
    @Query("gameweekId") gameweekId?: string,
    @Query("clubId") clubId?: string,
    @Query("status") status?: FixtureStatus,
  ) {
    const data = await this.catalogService.getFixtures({
      seasonId,
      gameweekId,
      clubId,
      status,
    });
    return { data };
  }

  @Get("fixtures/:id")
  async getFixture(@Param("id") id: string) {
    const data = await this.catalogService.getFixture(id);
    return { data };
  }

  @Get("fixtures/:id/events")
  async getFixtureEvents(@Param("id") id: string) {
    const data = await this.catalogService.getFixtureEvents(id);
    return { data };
  }

  @Get("fixtures/:id/statistics")
  async getFixtureStats(@Param("id") id: string) {
    const data = await this.catalogService.getFixtureStats(id);
    return { data };
  }
}
