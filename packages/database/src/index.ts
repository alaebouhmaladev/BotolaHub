import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    'postgresql://botolahub:botolahub_dev_secret@localhost:5434/botolahub_dev?schema=public';
}

export * from '@prisma/client';

export const prisma = new PrismaClient();

export async function checkDatabaseReadiness(
  client: PrismaClient = prisma,
): Promise<{ status: 'ok' | 'error'; latencyMs: number; message?: string }> {
  const start = Date.now();
  try {
    await client.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;
    return { status: 'ok', latencyMs };
  } catch (error) {
    const latencyMs = Date.now() - start;
    const message = error instanceof Error ? error.message : String(error);
    return { status: 'error', latencyMs, message };
  }
}
