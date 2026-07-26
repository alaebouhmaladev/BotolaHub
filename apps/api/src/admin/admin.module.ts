import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller.js";
import { IngestionService } from "../ingestion/ingestion.service.js";
import { ScoringService } from "../scoring/scoring.service.js";
import { PrismaModule } from "../prisma/prisma.module.js";

@Module({
  imports: [PrismaModule],
  controllers: [AdminController],
  providers: [IngestionService, ScoringService],
  exports: [IngestionService, ScoringService],
})
export class AdminModule {}
