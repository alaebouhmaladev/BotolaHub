import { Module } from "@nestjs/common";
import { FantasyTeamController } from "./fantasy-teams.controller.js";
import { FantasyTeamService } from "./fantasy-teams.service.js";
import { CatalogModule } from "../catalog/catalog.module.js";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [
    CatalogModule,
    JwtModule.register({
      secret:
        process.env.JWT_SECRET || "botolahub_dev_jwt_secret_32chars_min!!",
    }),
  ],
  controllers: [FantasyTeamController],
  providers: [FantasyTeamService],
  exports: [FantasyTeamService],
})
export class FantasyTeamModule {}
