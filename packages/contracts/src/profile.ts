import { z } from 'zod';

export const CompleteOnboardingDtoSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  displayName: z.string().min(2).max(50),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  birthDate: z.string().refine((val) => {
    const date = new Date(val);
    if (isNaN(date.getTime())) return false;
    const age = (Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return age >= 13; // Minimum age 13
  }, 'User must be at least 13 years old'),
  city: z.string().min(2),
  favoriteClubId: z.string().uuid(),
  avatarUrl: z.string().url().optional(),
  phoneNumber: z.string().optional(),
});
export type CompleteOnboardingDto = z.infer<typeof CompleteOnboardingDtoSchema>;

export const UpdateProfileDtoSchema = CompleteOnboardingDtoSchema.partial();
export type UpdateProfileDto = z.infer<typeof UpdateProfileDtoSchema>;

export const UserProfileResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  username: z.string(),
  displayName: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  birthDate: z.string(),
  city: z.string(),
  favoriteClubId: z.string(),
  avatarUrl: z.string().nullable(),
  phoneNumber: z.string().nullable(),
  favoriteClub: z.object({
    id: z.string(),
    name: z.string(),
    shortName: z.string(),
    code: z.string(),
    primaryColor: z.string(),
    secondaryColor: z.string(),
    logoUrl: z.string().nullable(),
  }),
});
export type UserProfileResponse = z.infer<typeof UserProfileResponseSchema>;
