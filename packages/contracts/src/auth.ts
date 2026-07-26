import { z } from 'zod';

export const RegisterEmailDtoSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});
export type RegisterEmailDto = z.infer<typeof RegisterEmailDtoSchema>;

export const LoginEmailDtoSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});
export type LoginEmailDto = z.infer<typeof LoginEmailDtoSchema>;

export const RequestPhoneOtpDtoSchema = z.object({
  phoneNumber: z.string().min(8, 'Phone number must be at least 8 characters long'),
});
export type RequestPhoneOtpDto = z.infer<typeof RequestPhoneOtpDtoSchema>;

export const VerifyPhoneOtpDtoSchema = z.object({
  phoneNumber: z.string().min(8),
  otpCode: z.string().length(6, 'OTP must be 6 digits'),
});
export type VerifyPhoneOtpDto = z.infer<typeof VerifyPhoneOtpDtoSchema>;

export const OAuthLoginDtoSchema = z.object({
  provider: z.enum(['GOOGLE', 'FACEBOOK', 'APPLE']),
  token: z.string().min(1),
  linkUserId: z.string().optional(),
});
export type OAuthLoginDto = z.infer<typeof OAuthLoginDtoSchema>;

export const RefreshTokenDtoSchema = z.object({
  refreshToken: z.string().optional(),
});
export type RefreshTokenDto = z.infer<typeof RefreshTokenDtoSchema>;

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(), // Provided in body ONLY for mobile clients
  user: z.object({
    id: z.string(),
    email: z.string().nullable(),
    role: z.enum(['USER', 'ADMIN']),
    isProfileCompleted: z.boolean(),
  }),
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const AccountLinkingChallengeSchema = z.object({
  error: z.literal('ACCOUNT_LINKING_REQUIRED'),
  message: z.string(),
  existingEmail: z.string(),
  provider: z.enum(['GOOGLE', 'FACEBOOK', 'APPLE']),
});
export type AccountLinkingChallenge = z.infer<typeof AccountLinkingChallengeSchema>;
