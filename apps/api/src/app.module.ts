import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { ProfileModule } from './profile/profile.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { AdminModule } from './admin/admin.module.js';

@Module({
  imports: [AuthModule, ProfileModule, CatalogModule, AdminModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
