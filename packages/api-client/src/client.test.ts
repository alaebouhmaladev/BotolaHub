import { describe, it, expect, vi } from 'vitest';
import { BotolaHubApiClient } from './client.js';

describe('BotolaHubApiClient', () => {
  it('calls getHealth and parses typed response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'ok',
        timestamp: '2026-07-26T12:00:00.000Z',
        service: 'botolahub-api',
        version: '0.1.0-dev',
        environment: 'development',
      }),
    });

    const client = new BotolaHubApiClient({
      baseUrl: 'http://localhost:3000',
      fetchFn: mockFetch as any,
    });
    const health = await client.getHealth();

    expect(health.status).toBe('ok');
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/health');
  });
});
