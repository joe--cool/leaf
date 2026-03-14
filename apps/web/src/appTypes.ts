import type { ScheduleKind } from '@leaf/shared';

export type User = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  timezone: string;
  weeklyDigestDay: number;
  weeklyDigestHour: number;
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
  member: { id: string; email: string; name: string };
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
  periodStart: string;
  periodEnd: string;
  title: string;
  audience: string;
  subjectName: string;
  summary: string;
  accountabilityLabel: string;
  accountabilityScore: number | null;
  trendLabel: string;
  trendDelta: number | null;
  visibility: string;
  highlights: string[];
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
