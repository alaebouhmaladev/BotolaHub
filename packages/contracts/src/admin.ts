import { z } from 'zod';

export const CreateClubDtoSchema = z.object({
  name: z.string().min(2),
  shortName: z.string().min(2),
  code: z.string().min(2).max(6),
  primaryColor: z.string().default('#008751'),
  secondaryColor: z.string().default('#FFFFFF'),
  logoUrl: z.string().url().optional(),
  isPlaceholder: z.boolean().default(false),
  auditReason: z.string().optional(),
});
export type CreateClubDto = z.infer<typeof CreateClubDtoSchema>;

export const CreateSeasonDtoSchema = z.object({
  competitionId: z.string(),
  name: z.string().min(2),
  year: z.string().min(4),
  startDate: z.string(),
  endDate: z.string(),
  isActive: z.boolean().default(false),
  auditReason: z.string().optional(),
});
export type CreateSeasonDto = z.infer<typeof CreateSeasonDtoSchema>;
