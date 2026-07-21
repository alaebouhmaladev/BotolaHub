export function createMockEnvironment(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://botolahub:botolahub_secret@localhost:5432/botolahub_test_db',
    REDIS_URL: 'redis://localhost:6379',
    ...overrides,
  };
}
