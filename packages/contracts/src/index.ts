import { z } from "zod";

// Health response contract
export const HealthResponseSchema = z.object({
  status: z.enum(["ok", "degraded", "error"]),
  timestamp: z.string(),
  uptimeSeconds: z.number(),
  version: z.string(),
  services: z.object({
    database: z.enum(["up", "down"]),
    redis: z.enum(["up", "down"]),
  }),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// Auth DTO contracts
export const RegisterDtoSchema = z.object({
  email: z.string().email("Invalid email address"),
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(50, "Display name must be at most 50 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain uppercase, lowercase, and numbers",
    ),
  preferredLanguage: z.enum(["ar", "fr", "en"]).default("en"),
});

export type RegisterDtoType = z.infer<typeof RegisterDtoSchema>;

export const LoginDtoSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginDtoType = z.infer<typeof LoginDtoSchema>;

export const RefreshTokenDtoSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export type RefreshTokenDtoType = z.infer<typeof RefreshTokenDtoSchema>;

export const UserSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  role: z.string(),
  preferredLanguage: z.string().optional(),
  createdAt: z.string().optional(),
});

export type User = z.infer<typeof UserSchema>;

export const WebAuthSuccessDataSchema = z.object({
  accessToken: z.string(),
  user: UserSchema,
});

export type WebAuthSuccessData = z.infer<typeof WebAuthSuccessDataSchema>;

export const MobileAuthSuccessDataSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: UserSchema,
});

export type MobileAuthSuccessData = z.infer<typeof MobileAuthSuccessDataSchema>;

export const AuthSuccessDataSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  user: UserSchema,
});

export type AuthSuccessData = z.infer<typeof AuthSuccessDataSchema>;
