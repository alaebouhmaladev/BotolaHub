import { describe, it, expect } from 'vitest';
import { validateEnv } from './env.js';

describe('Environment validation', () => {
  it('parses default values cleanly when empty object provided', () => {
    const env = validateEnv({});
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT_API).toBe(3000);
    expect(env.POSTGRES_USER).toBe('botolahub');
    expect(env.REDIS_PORT).toBe(6379);
  });

  it('overrides defaults with provided values', () => {
    const env = validateEnv({
      PORT_API: '4000',
      NODE_ENV: 'production',
      POSTGRES_HOST: 'db.example.com',
    });
    expect(env.PORT_API).toBe(4000);
    expect(env.NODE_ENV).toBe('production');
    expect(env.POSTGRES_HOST).toBe('db.example.com');
  });
});
