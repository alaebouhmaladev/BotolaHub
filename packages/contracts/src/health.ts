import { z } from 'zod';

export const HealthStatusSchema = z.enum(['ok', 'error']);
export type HealthStatus = z.infer<typeof HealthStatusSchema>;

export const HealthCheckResponseSchema = z.object({
  status: HealthStatusSchema,
  timestamp: z.string(),
  service: z.string(),
  version: z.string(),
  environment: z.string(),
});
export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;

export const ComponentHealthSchema = z.object({
  status: HealthStatusSchema,
  latencyMs: z.number().optional(),
  message: z.string().optional(),
});
export type ComponentHealth = z.infer<typeof ComponentHealthSchema>;

export const ReadinessCheckResponseSchema = z.object({
  status: HealthStatusSchema,
  timestamp: z.string(),
  service: z.string(),
  version: z.string(),
  environment: z.string(),
  dependencies: z.object({
    postgres: ComponentHealthSchema,
    redis: ComponentHealthSchema,
  }),
});
export type ReadinessCheckResponse = z.infer<typeof ReadinessCheckResponseSchema>;
