import { describe, it, expect } from 'vitest';
import { HealthCheckResponseSchema, ReadinessCheckResponseSchema } from './health.js';

describe('Health contracts schema validation', () => {
  it('validates a valid HealthCheckResponse', () => {
    const valid = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'botolahub-api',
      version: '0.1.0-dev',
      environment: 'development',
    };
    const parsed = HealthCheckResponseSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it('validates a valid ReadinessCheckResponse', () => {
    const valid = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'botolahub-api',
      version: '0.1.0-dev',
      environment: 'development',
      dependencies: {
        postgres: { status: 'ok', latencyMs: 12 },
        redis: { status: 'ok', latencyMs: 3 },
      },
    };
    const parsed = ReadinessCheckResponseSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });
});
