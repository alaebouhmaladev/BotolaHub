import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const defaultDbUrl =
  process.env.DATABASE_URL ||
  "postgresql://botolahub:botolahub_secret@localhost:5435/botolahub_db?schema=public";

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: defaultDbUrl,
    },
  },
});

export { PrismaClient };

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || defaultDbUrl,
        },
      },
    });
    await client.$queryRaw`SELECT 1`;
    await client.$disconnect();
    return true;
  } catch (error) {
    console.error("Database connection error:", error);
    return false;
  }
}
