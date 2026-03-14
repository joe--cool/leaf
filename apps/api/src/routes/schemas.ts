import { loginSchema } from '@leaf/shared';
import { z } from 'zod';

export const completeSchema = z.object({
  occurredAt: z.string().optional(),
  note: z.string().optional(),
});

export const inviteSchema = z.object({
  email: z.string().email(),
  targetUserId: z.string().optional(),
});

export const acceptInviteSchema = z.object({ token: z.string().min(1) });
export const adminReviewerSchema = z.object({ reviewerId: z.string(), revieweeId: z.string() });
export const preferencesSchema = z.object({
  weeklyDigestHour: z.number().int().min(0).max(23).optional(),
  weeklyDigestDay: z.number().int().min(0).max(6).optional(),
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
