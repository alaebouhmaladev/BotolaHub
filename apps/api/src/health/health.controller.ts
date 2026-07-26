import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheckResponse, ReadinessCheckResponse } from '@botolahub/contracts';
import { checkDatabaseReadiness } from '@botolahub/database';
import { validateEnv } from '@botolahub/config';
import Redis from 'ioredis';

@ApiTags('Health')
@Controller('api/v1/health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Basic API Health Check' })
  @ApiResponse({ status: 200, description: 'API is healthy' })
  getHealth(): HealthCheckResponse {
    const env = validateEnv();
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'botolahub-api',
      version: '0.1.0-dev',
      environment: env.APP_ENV,
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness Probe' })
  @ApiResponse({ status: 200, description: 'API process is alive' })
  getLiveness(): HealthCheckResponse {
    return this.getHealth();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness Probe checking DB and Redis' })
  @ApiResponse({ status: 200, description: 'Dependencies are healthy' })
  async getReadiness(): Promise<ReadinessCheckResponse> {
    const env = validateEnv();
    const dbHealth = await checkDatabaseReadiness();

    let redisHealth: { status: 'ok' | 'error'; latencyMs?: number; message?: string } = {
      status: 'error',
      message: 'Not checked',
    };

    const redisStart = Date.now();
    try {
      const redis = new Redis(env.REDIS_URL, {
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });
      await redis.connect();
      const pingRes = await redis.ping();
      const latencyMs = Date.now() - redisStart;
      await redis.quit();

      if (pingRes === 'PONG') {
        redisHealth = { status: 'ok', latencyMs };
      } else {
        redisHealth = {
          status: 'error',
          latencyMs,
          message: `Unexpected ping response: ${pingRes}`,
        };
      }
    } catch (err) {
      const latencyMs = Date.now() - redisStart;
      redisHealth = {
        status: 'error',
        latencyMs,
        message: err instanceof Error ? err.message : String(err),
      };
    }

    const overallOk = dbHealth.status === 'ok' && redisHealth.status === 'ok';

    return {
      status: overallOk ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      service: 'botolahub-api',
      version: '0.1.0-dev',
      environment: env.APP_ENV,
      dependencies: {
        postgres: dbHealth,
        redis: redisHealth,
      },
    };
  }
}
