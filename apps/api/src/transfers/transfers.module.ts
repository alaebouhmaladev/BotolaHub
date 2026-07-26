import { Module } from "@nestjs/common";
import { TransfersController } from "./transfers.controller.js";
import { TransfersService } from "./transfers.service.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret:
        process.env.JWT_SECRET || "botolahub_dev_jwt_secret_32chars_min!!",
    }),
  ],
  controllers: [TransfersController],
  providers: [TransfersService],
  exports: [TransfersService],
})
export class TransfersModule {}
