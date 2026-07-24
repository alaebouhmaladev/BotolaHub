import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@botolahub/database";

const defaultDbUrl =
  process.env.DATABASE_URL ||
  "postgresql://botolahub:botolahub_secret@127.0.0.1:5435/botolahub_db?schema=public";

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly client: PrismaClient;

  constructor() {
    this.client = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || defaultDbUrl,
        },
      },
    });
  }

  async onModuleInit() {
    try {
      await this.client.$connect();
    } catch (error) {
      if (process.env.NODE_ENV === "production") {
        throw error;
      }
      console.warn("⚠️ Database connection warning on startup:", error);
    }
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
