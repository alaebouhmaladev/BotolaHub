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

export const RegisterDto = z.object({
  email: z.string().email(),
  displayName: z.string().min(2).max(50),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/[0-9]/, "Must contain a digit"),
  preferredLanguage: z.enum(["ar", "fr", "en"]).optional().default("en"),
});

export const LoginDto = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const RefreshDto = z.object({
  refreshToken: z.string().min(1),
});

export type RegisterDtoType = z.infer<typeof RegisterDto>;
export type LoginDtoType = z.infer<typeof LoginDto>;
export type RefreshDtoType = z.infer<typeof RefreshDto>;

export const UserSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  role: z.string(),
  preferredLanguage: z.string().optional(),
  createdAt: z.string().optional(),
});

export type User = z.infer<typeof UserSchema>;

export const AuthSuccessDataSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  user: UserSchema,
});

export type AuthSuccessData = z.infer<typeof AuthSuccessDataSchema>;
