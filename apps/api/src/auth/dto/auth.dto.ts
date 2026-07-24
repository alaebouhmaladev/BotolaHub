import { z } from "zod";

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

export const RefreshTokenDto = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const RefreshDto = RefreshTokenDto;

export type RegisterDtoType = z.infer<typeof RegisterDto>;
export type LoginDtoType = z.infer<typeof LoginDto>;
export type RefreshTokenDtoType = z.infer<typeof RefreshTokenDto>;
export type RefreshDtoType = RefreshTokenDtoType;
