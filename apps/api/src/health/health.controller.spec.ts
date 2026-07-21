import { describe, expect, it, vi } from 'vitest';
import { HealthController } from './health.controller.js';

vi.mock('@botolahub/database', () => ({
  checkDatabaseConnection: vi.fn().mockResolvedValue(true),
}));

vi.mock('ioredis', () => {
  return {
    Redis: vi.fn().mockImplementation(() => ({
      ping: vi.fn().mockResolvedValue('PONG'),
      quit: vi.fn().mockResolvedValue('OK'),
    })),
  };
});

describe('HealthController', () => {
  it('returns healthy status payload', async () => {
    const controller = new HealthController();
    const result = await controller.checkHealth();

    expect(result.status).toBe('ok');
    expect(result.services.database).toBe('connected');
    expect(result.services.redis).toBe('connected');
  });
});
