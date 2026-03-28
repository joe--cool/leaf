import type { RelationshipTemplateId, ProposedRelationship, ScheduleKind } from '@leaf/shared';

export type User = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  timezone: string;
  weeklyDigestDay: number;
  weeklyDigestHour: number;
  reflectionCadence: 'daily' | 'weekly' | 'monthly';
  reflectionWeekday: number;
  reflectionMonthDay: number;
  reflectionPrompt?: string | null;
  roles: Array<{ role: string }>;
  members: Array<
    RelationshipDetails & {
      member: { id: string; email: string; name: string };
    }
  >;
  guides: Array<
    RelationshipDetails & {
      guide: { id: string; email: string; name: string };
    }
  >;
};

export type RelationshipDetails = {
  mode?: 'active' | 'passive';
  canActOnItems?: boolean;
  canManageRoutines?: boolean;
  canManageFollowThrough?: boolean;
  historyWindow?: string;
  hiddenItemCount?: number;
  createdAt?: string;
};

export type Item = {
  id: string;
  title: string;
  category: string;
  scheduleKind: ScheduleKind;
  scheduleData?: Record<string, unknown>;
  completions?: ItemCompletion[];
  notificationEnabled?: boolean;
  notificationHardToDismiss?: boolean;
  notificationRepeatMinutes?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type ItemCompletion = {
  id: string;
  occurredAt: string;
  note?: string | null;
};

export type MemberItem = Item & {
  completions: ItemCompletion[];
};

export type MemberWorkspace = {
  member: {
    id: string;
    email: string;
    name: string;
    reflectionCadence: 'daily' | 'weekly' | 'monthly';
    reflectionWeekday: number;
    reflectionMonthDay: number;
    reflectionPrompt?: string | null;
  };
  relationship: {
    mode: 'active' | 'passive';
    canActOnItems: boolean;
    canManageRoutines: boolean;
    canManageFollowThrough: boolean;
    historyWindow: string;
    hiddenItemCount: number;
    createdAt?: string;
  };
  items: MemberItem[];
};

export type OAuthProvider = 'google' | 'apple';

export type InvitePreview = {
  token: string;
  inviteeEmail: string;
  expiresAt: string;
  inviter: { id: string; email: string; name: string };
  member: { id: string; email: string; name: string } | null;
  proposedRelationship: ProposedRelationship;
};

export type AuthNextStep = {
  title: string;
  description: string;
  path: string;
  actionLabel: string;
};

export type RelationshipTemplateCard = {
  id: RelationshipTemplateId;
  label: string;
  badge: string;
  mode: 'active' | 'passive';
  guideCanDo: string;
  guideReceives: string;
  history: string;
  privacy: string;
};

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  roles: Array<{ role: string }>;
};

export type AuditLogEntry = {
  id: string;
  occurredAt: string;
  category: 'account' | 'relationship' | 'routine' | 'activity' | 'invite';
  scope: 'self' | 'member' | 'guide';
  subjectName: string;
  title: string;
  detail: string;
  actorName: string;
  visibility: string;
};

export type RetrospectiveEntry = {
  id: string;
  subjectUserId: string;
  kind: 'manual' | 'scheduled';
  periodStart: string;
  periodEnd: string;
  title: string;
  audience: string;
  subjectName: string;
  visibility: string;
  createdAt: string;
  createdByName: string;
  summary: string | null;
  promptPreset: string;
  prompts: string[];
  writingPrompt?: string | null;
  viewerRole: 'member' | 'guide' | 'observer';
  canContribute: boolean;
  contributions: RetrospectiveContribution[];
};

export type RetrospectiveDraftKind = 'manual' | 'scheduled';

export type RetrospectiveSubjectOption = {
  id: string;
  label: string;
  detail: string;
  name: string;
  cadence: 'daily' | 'weekly' | 'monthly';
  writingPrompt?: string | null;
};

export type RetrospectiveContribution = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
  authorRole: 'member' | 'guide' | 'participant';
};

export type PageKey =
  | 'dashboard'
  | 'profile'
  | 'my-items'
  | 'members'
  | 'routines'
  | 'retrospectives'
  | 'audit-log'
  | 'admin';
export type SingleScheduleKind = Exclude<ScheduleKind, 'MULTI'>;
export type ActionBucket = 'due' | 'upcoming' | 'later';

export type ActionSummary = {
  bucket: ActionBucket;
  urgency: number;
  status: string;
  detail: string;
  dueAt?: number;
};

export type ActionableItem = {
  item: Item;
  action: ActionSummary;
};

export type MemberRecentActivity = {
  id: string;
  itemTitle: string;
  occurredAt: string;
  note?: string | null;
};

export type MemberPortfolio = MemberWorkspace & {
  actionable: ActionableItem[];
  overdue: ActionableItem[];
  dueToday: ActionableItem[];
  upcoming: ActionableItem[];
  missedCount: number;
  recentActivity: MemberRecentActivity[];
  nextUrgent: ActionableItem | null;
  rank: number;
};

export type NotificationFeedEntry = {
  id: string;
  category: 'member' | 'guide' | 'visibility';
  title: string;
  detail: string;
  timestamp?: string;
  status: string;
  acknowledgement: string;
};

export type DraftSchedule = {
  kind: SingleScheduleKind;
  label: string;
  oneTimeAt: string;
  dailyTimes: string[];
  weekdays: number[];
  intervalDays: string;
  intervalAnchor: string;
  customDates: string[];
};

export type ItemCreationMode = 'recurring' | 'one-time';
