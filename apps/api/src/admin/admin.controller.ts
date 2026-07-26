import { Controller, Post, Body, Inject } from "@nestjs/common";
import { IngestionService } from "../ingestion/ingestion.service.js";
import { ScoringService } from "../scoring/scoring.service.js";

@Controller("admin")
export class AdminController {
  constructor(
    @Inject(IngestionService)
    private readonly ingestionService: IngestionService,
    @Inject(ScoringService) private readonly scoringService: ScoringService,
  ) {}

  @Post("ingest-mock-gameweek")
  async ingestMockGameweek(@Body("gameweekNumber") gameweekNumber?: number) {
    const data = await this.ingestionService.ingestMockGameweek(
      gameweekNumber || 1,
    );
    return { data };
  }

  @Post("score-gameweek")
  async scoreGameweek(@Body("gameweekId") gameweekId: string) {
    const data = await this.scoringService.scoreGameweek(gameweekId);
    return { data };
  }
}
