import { z } from 'zod';

export const ClubSchema = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string(),
  code: z.string(),
  primaryColor: z.string(),
  secondaryColor: z.string(),
  logoUrl: z.string().nullable(),
  isPlaceholder: z.boolean(),
});
export type ClubDto = z.infer<typeof ClubSchema>;

export const SeasonSchema = z.object({
  id: z.string(),
  competitionId: z.string(),
  name: z.string(),
  year: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  isActive: z.boolean(),
});
export type SeasonDto = z.infer<typeof SeasonSchema>;

export const CompetitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  code: z.string(),
  logoUrl: z.string().nullable(),
});
export type CompetitionDto = z.infer<typeof CompetitionSchema>;
