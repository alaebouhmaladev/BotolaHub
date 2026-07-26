export function createMockEnvironment(overrides: Record<string, string> = {}) {
  return {
    NODE_ENV: 'test',
    APP_ENV: 'local',
    PORT_API: '3000',
    PORT_WEB: '3001',
    PORT_ADMIN: '3002',
    PORT_MOBILE: '8081',
    POSTGRES_USER: 'botolahub',
    POSTGRES_PASSWORD: 'botolahub_dev_secret',
    POSTGRES_DB: 'botolahub_dev',
    POSTGRES_HOST: 'localhost',
    POSTGRES_PORT: '5432',
    DATABASE_URL:
      'postgresql://botolahub:botolahub_dev_secret@localhost:5432/botolahub_dev?schema=public',
    REDIS_HOST: 'localhost',
    REDIS_PORT: '6379',
    REDIS_URL: 'redis://localhost:6379',
    ...overrides,
  };
}
