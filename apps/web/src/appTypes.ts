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
  reviewTargets: Array<{ reviewee: { id: string; email: string; name: string } }>;
  reviewers: Array<{ reviewer: { id: string; email: string; name: string } }>;
};

export type Item = {
  id: string;
  title: string;
  category: string;
  scheduleKind: ScheduleKind;
  scheduleData?: Record<string, unknown>;
};

export type ItemCompletion = {
  id: string;
  occurredAt: string;
  note?: string | null;
};

export type RevieweeItem = Item & {
  completions: ItemCompletion[];
};

export type RevieweeWorkspace = {
  reviewee: { id: string; email: string; name: string };
  relationship: {
    mode: 'active' | 'passive';
    canActOnItems: boolean;
    canManageRoutines: boolean;
    canManageAccountability: boolean;
    historyWindow: string;
    hiddenItemCount: number;
  };
  items: RevieweeItem[];
};

export type OAuthProvider = 'google' | 'apple';

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  roles: Array<{ role: string }>;
};

export type PageKey = 'dashboard' | 'profile' | 'my-items' | 'reviewees' | 'routines' | 'admin';
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

export type RevieweeRecentActivity = {
  id: string;
  itemTitle: string;
  occurredAt: string;
  note?: string | null;
};

export type RevieweePortfolio = RevieweeWorkspace & {
  actionable: ActionableItem[];
  overdue: ActionableItem[];
  dueToday: ActionableItem[];
  upcoming: ActionableItem[];
  missedCount: number;
  recentActivity: RevieweeRecentActivity[];
  nextUrgent: ActionableItem | null;
  rank: number;
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
