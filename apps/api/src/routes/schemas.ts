import { loginSchema, relationshipTemplateIdSchema } from '@leaf/shared';
import { z } from 'zod';

export const completeSchema = z.object({
  occurredAt: z.string().optional(),
  targetAt: z.string().optional(),
  note: z.string().optional(),
});

export const occurrenceActionSchema = z.object({
  kind: z.enum(['complete', 'skip', 'note']),
  targetAt: z.string().datetime(),
  note: z.string().trim().max(2000).optional(),
});

export const inviteSchema = z.object({
  email: z.string().email(),
  targetMemberId: z.string().optional(),
  relationshipTemplateId: relationshipTemplateIdSchema.default('active-guide'),
});

export const acceptInviteSchema = z.object({ token: z.string().min(1) });
export const adminGuideSchema = z.object({ guideId: z.string(), memberId: z.string() });
export const preferencesSchema = z.object({
  targetMemberId: z.string().optional(),
  weeklyDigestHour: z.number().int().min(0).max(23).optional(),
  weeklyDigestDay: z.number().int().min(0).max(6).optional(),
  reflectionCadence: z.enum(['daily', 'weekly', 'monthly']).optional(),
  reflectionWeekday: z.number().int().min(0).max(6).optional(),
  reflectionMonthDay: z.number().int().min(1).max(31).optional(),
  reflectionPrompt: z.string().max(2000).nullable().optional(),
  timezone: z.string().optional(),
  name: z.string().min(1).optional(),
  avatarUrl: z.string().nullable().optional(),
});
export const bootstrapAdminSchema = z.object({ userId: z.string() });
export const idParamSchema = z.object({ id: z.string() });
export const oauthStartQuerySchema = z.object({
  returnTo: z.string().url().default('http://localhost:5173/oauth/callback'),
});
export const oauthCallbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});
export const refreshSchema = z.object({ refreshToken: z.string().min(1) });
export const firstAdminSetupSchema = loginSchema.extend({
  name: z.string().min(1),
  setupToken: z.string().optional(),
  demoMode: z.boolean().optional(),
});
export const inviteRegistrationSchema = loginSchema.extend({
  name: z.string().min(1),
  token: z.string().min(1),
});
