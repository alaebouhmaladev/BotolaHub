import { describe, it, expect } from 'vitest';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  it('returns ok status for getHealth', () => {
    const controller = new HealthController();
    const res = controller.getHealth();
    expect(res.status).toBe('ok');
    expect(res.service).toBe('botolahub-api');
  });

  it('returns ok status for getLiveness', () => {
    const controller = new HealthController();
    const res = controller.getLiveness();
    expect(res.status).toBe('ok');
  });
});
