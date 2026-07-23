import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { prisma } from "@botolahub/database";

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly client = prisma;

  async onModuleInit() {
    try {
      await this.client.$connect();
    } catch (error) {
      if (process.env.NODE_ENV === "production") {
        throw error;
      }
      console.warn(
        "⚠️ Could not connect to PostgreSQL database on startup. Ensure Docker container is running.",
      );
    }
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
