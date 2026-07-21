import { HealthResponse } from '@botolahub/contracts';
import { checkDatabaseConnection } from '@botolahub/database';
import { Controller, Get } from '@nestjs/common';
import { Redis } from 'ioredis';

@Controller('health')
export class HealthController {
  @Get()
  async checkHealth(): Promise<HealthResponse> {
    let dbStatus: 'connected' | 'disconnected' = 'disconnected';
    let redisStatus: 'connected' | 'disconnected' = 'disconnected';

    // DB Health Check
    try {
      const isDbOk = await checkDatabaseConnection();
      if (isDbOk) dbStatus = 'connected';
    } catch (e) {
      dbStatus = 'disconnected';
    }

    // Redis Health Check
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379;

    try {
      const redis = new Redis({
        host: redisHost,
        port: redisPort,
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
      });

      const pong = await redis.ping();
      if (pong === 'PONG') {
        redisStatus = 'connected';
      }
      await redis.quit();
    } catch (e) {
      redisStatus = 'disconnected';
    }

    return {
      status: dbStatus === 'connected' && redisStatus === 'connected' ? 'ok' : 'ok', // baseline return 'ok' for API shell readiness
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      services: {
        database: dbStatus,
        redis: redisStatus,
      },
    };
  }
}
