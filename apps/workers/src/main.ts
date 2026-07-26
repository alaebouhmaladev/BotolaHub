import { validateEnv } from '@botolahub/config';
import Redis from 'ioredis';

async function bootstrapWorkers() {
  const env = validateEnv();

  console.log(
    JSON.stringify({
      level: 'info',
      message: 'Starting BotolaHub Background Worker Service...',
      service: 'botolahub-workers',
      timestamp: new Date().toISOString(),
    }),
  );

  const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });

  redis.on('connect', () => {
    console.log(
      JSON.stringify({
        level: 'info',
        message: 'Worker connected to Redis successfully',
        redisHost: env.REDIS_HOST,
        redisPort: env.REDIS_PORT,
        timestamp: new Date().toISOString(),
      }),
    );
  });

  redis.on('error', (err) => {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Worker Redis connection error',
        error: err.message,
        timestamp: new Date().toISOString(),
      }),
    );
  });

  const shutdown = async (signal: string) => {
    console.log(
      JSON.stringify({
        level: 'info',
        message: `Received ${signal}. Shutting down worker service cleanly...`,
        timestamp: new Date().toISOString(),
      }),
    );

    try {
      await redis.quit();
      console.log(
        JSON.stringify({
          level: 'info',
          message: 'Worker Redis connection closed. Shutdown complete.',
          timestamp: new Date().toISOString(),
        }),
      );
      process.exit(0);
    } catch (err) {
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'Error during worker shutdown',
          error: err instanceof Error ? err.message : String(err),
          timestamp: new Date().toISOString(),
        }),
      );
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrapWorkers().catch((err) => {
  console.error('Fatal worker startup error:', err);
  process.exit(1);
});
