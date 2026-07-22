import dotenv from "dotenv";
import { Redis } from "ioredis";

dotenv.config();

export async function initWorker() {
  console.log("[BotolaHub Worker] Starting background worker shell...");

  const redisHost = process.env.REDIS_HOST || "localhost";
  const redisPort = process.env.REDIS_PORT
    ? parseInt(process.env.REDIS_PORT, 10)
    : 6379;

  try {
    const redis = new Redis({
      host: redisHost,
      port: redisPort,
      connectTimeout: 2000,
      maxRetriesPerRequest: 1,
    });

    const pong = await redis.ping();
    console.log(`[BotolaHub Worker] Redis Connection check: ${pong}`);
    await redis.quit();
  } catch (err) {
    console.warn(
      "[BotolaHub Worker] Could not connect to Redis during startup (will retry on job processing):",
      err,
    );
  }

  console.log(
    "[BotolaHub Worker] Background worker initialized and ready for BullMQ queues.",
  );
}

if (process.env.NODE_ENV !== "test" && require.main === module) {
  initWorker();
}
