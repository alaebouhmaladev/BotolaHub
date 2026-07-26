import { z } from 'zod';

export const EnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_ENV: z.enum(['local', 'staging', 'production']).default('local'),
  PORT_API: z.coerce.number().default(3000),
  PORT_WEB: z.coerce.number().default(3001),
  PORT_ADMIN: z.coerce.number().default(3002),
  PORT_MOBILE: z.coerce.number().default(8081),
  POSTGRES_USER: z.string().default('botolahub'),
  POSTGRES_PASSWORD: z.string().default('botolahub_dev_secret'),
  POSTGRES_DB: z.string().default('botolahub_dev'),
  POSTGRES_HOST: z.string().default('localhost'),
  POSTGRES_PORT: z.coerce.number().default(5432),
  DATABASE_URL: z
    .string()
    .default(
      'postgresql://botolahub:botolahub_dev_secret@localhost:5432/botolahub_dev?schema=public',
    ),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  NEXT_PUBLIC_API_URL: z.string().default('http://localhost:3000'),
  EXPO_PUBLIC_API_URL: z.string().default('http://localhost:3000'),
});

export type Environment = z.infer<typeof EnvironmentSchema>;

export function validateEnv(envInput: Record<string, unknown> = process.env): Environment {
  const result = EnvironmentSchema.safeParse(envInput);
  if (!result.success) {
    console.error('❌ Environment validation error:', result.error.format());
    throw new Error(
      `Invalid environment configuration: ${JSON.stringify(result.error.flatten().fieldErrors)}`,
    );
  }
  return result.data;
}
