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

export const relationshipModeSchema = z.enum(['active', 'passive']);
export type RelationshipMode = z.infer<typeof relationshipModeSchema>;

export const relationshipHistoryWindowSchema = z.enum([
  'future-only',
  'since-relationship-start',
  'last-30-days-and-upcoming',
  'full-history',
]);
export type RelationshipHistoryWindow = z.infer<typeof relationshipHistoryWindowSchema>;

export const hiddenItemVisibilitySchema = z.enum(['show-existence', 'show-count']);
export type HiddenItemVisibility = z.infer<typeof hiddenItemVisibilitySchema>;

export const relationshipSettingsSchema = z.object({
  templateId: relationshipTemplateIdSchema,
  mode: relationshipModeSchema,
  canActOnItems: z.boolean(),
  canManageRoutines: z.boolean(),
  canManageFollowThrough: z.boolean(),
  historyWindow: relationshipHistoryWindowSchema,
  hiddenItemVisibility: hiddenItemVisibilitySchema,
});
export type RelationshipSettings = z.infer<typeof relationshipSettingsSchema>;

export const proposedRelationshipSchema = relationshipSettingsSchema;
export type ProposedRelationship = z.infer<typeof proposedRelationshipSchema>;

export const relationshipUpdateSchema = relationshipSettingsSchema.omit({ templateId: true });
export type RelationshipUpdateInput = z.infer<typeof relationshipUpdateSchema>;

export const relationshipHistoryWindowOptions: Array<{
  value: RelationshipHistoryWindow;
  label: string;
  description: string;
}> = [
  {
    value: 'future-only',
    label: 'Future only',
    description: 'Visible work starts now and stays forward-looking.',
  },
  {
    value: 'since-relationship-start',
    label: 'Since relationship started',
    description: 'Past activity is visible only from the day this relationship became active.',
  },
  {
    value: 'last-30-days-and-upcoming',
    label: 'Last 30 days + upcoming items',
    description: 'Shows a recent accountability window plus what is coming next.',
  },
  {
    value: 'full-history',
    label: 'Full history',
    description: 'All visible item, reflection, and audit history stays available.',
  },
];

export const hiddenItemVisibilityOptions: Array<{
  value: HiddenItemVisibility;
  label: string;
  description: string;
}> = [
  {
    value: 'show-existence',
    label: 'Show that something is hidden',
    description: 'Guides learn that some items are outside view, but not how many.',
  },
  {
    value: 'show-count',
    label: 'Show how many items are hidden',
    description: 'Guides see the hidden-item count, but never item names or categories.',
  },
];

export function relationshipHistoryWindowLabel(value: RelationshipHistoryWindow): string {
  return relationshipHistoryWindowOptions.find((option) => option.value === value)?.label ?? 'Future only';
}

export function relationshipHistoryWindowDescription(value: RelationshipHistoryWindow): string {
  return (
    relationshipHistoryWindowOptions.find((option) => option.value === value)?.description ??
    'Visible work starts now and stays forward-looking.'
  );
}

export function hiddenItemVisibilityLabel(value: HiddenItemVisibility): string {
  return hiddenItemVisibilityOptions.find((option) => option.value === value)?.label ?? 'Show how many items are hidden';
}

export function hiddenItemVisibilityDescription(value: HiddenItemVisibility): string {
  return (
    hiddenItemVisibilityOptions.find((option) => option.value === value)?.description ??
    'Guides see the hidden-item count, but never item names or categories.'
  );
}

export function relationshipTemplateSettings(templateId: RelationshipTemplateId): RelationshipSettings {
  switch (templateId) {
    case 'active-guide':
      return {
        templateId,
        mode: 'active',
        canActOnItems: true,
        canManageRoutines: true,
        canManageFollowThrough: true,
        historyWindow: 'last-30-days-and-upcoming',
        hiddenItemVisibility: 'show-count',
      };
    case 'parent':
      return {
        templateId,
        mode: 'active',
        canActOnItems: true,
        canManageRoutines: true,
        canManageFollowThrough: true,
        historyWindow: 'full-history',
        hiddenItemVisibility: 'show-existence',
      };
    case 'accountability-partner':
      return {
        templateId,
        mode: 'active',
        canActOnItems: true,
        canManageRoutines: false,
        canManageFollowThrough: true,
        historyWindow: 'since-relationship-start',
        hiddenItemVisibility: 'show-count',
      };
    case 'passive-guide':
    default:
      return {
        templateId: 'passive-guide',
        mode: 'passive',
        canActOnItems: false,
        canManageRoutines: false,
        canManageFollowThrough: false,
        historyWindow: 'future-only',
        hiddenItemVisibility: 'show-count',
      };
  }
}

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
