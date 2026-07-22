import { z } from "zod";

export const HealthResponseSchema = z.object({
  status: z.enum(["ok", "error"]),
  timestamp: z.string(),
  version: z.string(),
  services: z.object({
    database: z.enum(["connected", "disconnected"]),
    redis: z.enum(["connected", "disconnected"]),
  }),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const SystemInfoSchema = z.object({
  environment: z.string(),
  appName: z.string(),
});

export type SystemInfo = z.infer<typeof SystemInfoSchema>;
