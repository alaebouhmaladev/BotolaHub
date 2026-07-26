import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module.js";
import { HealthModule } from "./health/health.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { CatalogModule } from "./catalog/catalog.module.js";
import { FantasyTeamModule } from "./fantasy-teams/fantasy-teams.module.js";
import { TransfersModule } from "./transfers/transfers.module.js";
import { AdminModule } from "./admin/admin.module.js";

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    AuthModule,
    CatalogModule,
    FantasyTeamModule,
    TransfersModule,
    AdminModule,
  ],
})
export class AppModule {}
