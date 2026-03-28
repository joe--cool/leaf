import { z } from 'zod';

export const roleSchema = z.enum(['USER', 'ADMIN']);
export type Role = z.infer<typeof roleSchema>;

export const scheduleKindSchema = z.enum([
  'ONE_TIME',
  'DAILY',
  'WEEKLY',
  'INTERVAL_DAYS',
  'CUSTOM_DATES',
  'MULTI',
]);
export type ScheduleKind = z.infer<typeof scheduleKindSchema>;

export const singleScheduleKindSchema = z.enum([
  'ONE_TIME',
  'DAILY',
  'WEEKLY',
  'INTERVAL_DAYS',
  'CUSTOM_DATES',
]);
export type SingleScheduleKind = z.infer<typeof singleScheduleKindSchema>;

export const singleScheduleSchema = z.object({
  kind: singleScheduleKindSchema,
  label: z.string().trim().min(1).max(40).optional(),
  oneTimeAt: z.string().datetime().optional(),
  dailyTimes: z.array(z.string()).optional(),
  weekdays: z.array(z.number().min(0).max(6)).optional(),
  intervalDays: z.number().int().positive().optional(),
  intervalAnchor: z.string().datetime().optional(),
  customDates: z.array(z.string().datetime()).optional(),
  timezone: z.string().default('UTC'),
});

export const multiScheduleSchema = z.object({
  kind: z.literal('MULTI'),
  schedules: z.array(singleScheduleSchema).min(1),
  timezone: z.string().default('UTC'),
});

export const scheduleSchema = z.union([singleScheduleSchema, multiScheduleSchema]);

export type SingleSchedule = z.infer<typeof singleScheduleSchema>;
export type MultiSchedule = z.infer<typeof multiScheduleSchema>;
export type Schedule = z.infer<typeof scheduleSchema>;

export const trackingItemCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().default('general'),
  schedule: scheduleSchema,
  notificationEnabled: z.boolean().default(true),
  notificationHardToDismiss: z.boolean().default(false),
  notificationRepeatMinutes: z.number().int().min(1).max(120).default(15),
});

export type TrackingItemCreateInput = z.infer<typeof trackingItemCreateSchema>;

export const trackingOccurrenceActionSchema = z.object({
  kind: z.enum(['complete', 'skip', 'note']),
  targetAt: z.string().datetime(),
  note: z.string().trim().max(2000).optional(),
});

export type TrackingOccurrenceActionInput = z.infer<typeof trackingOccurrenceActionSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const relationshipTemplateIdSchema = z.enum([
  'active-guide',
  'passive-guide',
  'parent',
  'accountability-partner',
]);
export type RelationshipTemplateId = z.infer<typeof relationshipTemplateIdSchema>;

export const proposedRelationshipSchema = z.object({
  templateId: relationshipTemplateIdSchema,
  mode: z.enum(['active', 'passive']),
  canActOnItems: z.boolean(),
  canManageRoutines: z.boolean(),
  canManageFollowThrough: z.boolean(),
  historyWindow: z.string().min(1),
});
export type ProposedRelationship = z.infer<typeof proposedRelationshipSchema>;

export const apiTokenSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  userId: z.string(),
  email: z.string().email(),
  roles: z.array(roleSchema),
});

export type ApiTokenResponse = z.infer<typeof apiTokenSchema>;

export const retrospectiveKindSchema = z.enum(['manual', 'scheduled']);
export type RetrospectiveKind = z.infer<typeof retrospectiveKindSchema>;

export const retrospectivePromptPresetSchema = z.enum([
  'weekly-review',
  'support-check-in',
  'reset-and-obstacles',
]);
export type RetrospectivePromptPreset = z.infer<typeof retrospectivePromptPresetSchema>;

export const defaultReflectionWritingPrompt =
  'What stands out from this period? What went well, what was harder than expected, and what is one thing to change or try next?';

export const retrospectiveCreateSchema = z.object({
  subjectUserId: z.string().optional(),
  kind: retrospectiveKindSchema.default('scheduled'),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  promptPreset: retrospectivePromptPresetSchema.default('weekly-review'),
  title: z.string().trim().min(1).max(120).optional(),
  summary: z.string().trim().min(1).max(2000).optional(),
});
export type RetrospectiveCreateInput = z.infer<typeof retrospectiveCreateSchema>;

export const retrospectiveContributionSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});
export type RetrospectiveContributionInput = z.infer<typeof retrospectiveContributionSchema>;

export const retrospectiveUpdateSchema = z.object({
  summary: z.string().trim().min(1).max(2000),
});
export type RetrospectiveUpdateInput = z.infer<typeof retrospectiveUpdateSchema>;
