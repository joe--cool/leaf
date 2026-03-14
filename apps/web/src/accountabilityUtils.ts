import type { ScheduleKind } from '@leaf/shared';
import { summarizeActionableState } from './scheduleUtils';
import type { Item } from './appTypes';

export type AccountabilitySummary = {
  label: 'On track' | 'Steady' | 'Needs attention' | 'Off track' | 'Monitoring' | 'No activity yet';
  score: number | null;
  trendLabel: 'Improving' | 'Holding steady' | 'Falling' | 'Building baseline';
  trendDelta: number | null;
  detail: string;
  supportText: string;
  overdueCount: number;
  dueCount: number;
  expectedCount: number;
  completedCount: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 7;

export function buildAccountabilitySummary(items: Item[], now = new Date()): AccountabilitySummary {
  if (items.length === 0) {
    return {
      label: 'No activity yet',
      score: null,
      trendLabel: 'Building baseline',
      trendDelta: null,
      detail: 'Add a routine to start building accountability status and trend.',
      supportText: 'Complete raises this score. Skipped will stay neutral. Missed appears after thresholds are configured.',
      overdueCount: 0,
      dueCount: 0,
      expectedCount: 0,
      completedCount: 0,
    };
  }

  const windowEnd = now.getTime();
  const windowStart = windowEnd - WINDOW_DAYS * DAY_MS;
  const previousStart = windowStart - WINDOW_DAYS * DAY_MS;

  const current = summarizeWindow(items, windowStart, windowEnd);
  const previous = summarizeWindow(items, previousStart, windowStart);
  const actionable = items.map((item) => summarizeActionableState(item, now));
  const overdueCount = actionable.filter((entry) => entry.status === 'Overdue').length;
  const dueCount = actionable.filter((entry) => entry.bucket === 'due').length;
  const score = percentage(current.completedCount, current.expectedCount);
  const previousScore = percentage(previous.completedCount, previous.expectedCount);
  const trendDelta = score !== null && previousScore !== null ? score - previousScore : null;

  return {
    label: resolveLabel(score, overdueCount, dueCount),
    score,
    trendLabel: resolveTrendLabel(trendDelta, score, previousScore),
    trendDelta,
    detail: buildDetail(score, current.completedCount, current.expectedCount, overdueCount, dueCount),
    supportText: 'Complete raises this score. Skipped will stay neutral. Missed appears after thresholds are configured.',
    overdueCount,
    dueCount,
    expectedCount: current.expectedCount,
    completedCount: current.completedCount,
  };
}

function summarizeWindow(items: Item[], start: number, end: number) {
  return items.reduce(
    (totals, item) => {
      const expectedCount = countScheduledOccurrences(item, start, end);
      const completedCount = Math.min(countCompletions(item, start, end), expectedCount);
      totals.expectedCount += expectedCount;
      totals.completedCount += completedCount;
      return totals;
    },
    { expectedCount: 0, completedCount: 0 },
  );
}

function percentage(completedCount: number, expectedCount: number) {
  if (expectedCount === 0) return null;
  return Math.round((completedCount / expectedCount) * 100);
}

function resolveLabel(score: number | null, overdueCount: number, dueCount: number): AccountabilitySummary['label'] {
  if (overdueCount >= 2) return 'Off track';
  if (overdueCount > 0 || dueCount >= 3) return 'Needs attention';
  if (score === null) return dueCount > 0 ? 'Needs attention' : 'Monitoring';
  if (score >= 85) return 'On track';
  if (score >= 65) return 'Steady';
  if (score >= 40) return 'Needs attention';
  return 'Off track';
}

function resolveTrendLabel(trendDelta: number | null, score: number | null, previousScore: number | null) {
  if (trendDelta === null) {
    if (score !== null && previousScore === null) return 'Building baseline';
    return 'Building baseline';
  }
  if (trendDelta >= 10) return 'Improving';
  if (trendDelta <= -10) return 'Falling';
  return 'Holding steady';
}

function buildDetail(
  score: number | null,
  completedCount: number,
  expectedCount: number,
  overdueCount: number,
  dueCount: number,
) {
  const scoreText =
    score === null
      ? 'No visible occurrences landed in the last 7 days yet.'
      : `${completedCount} of ${expectedCount} scheduled occurrences were completed in the last 7 days.`;

  if (overdueCount > 0) {
    return `${scoreText} ${overdueCount} overdue ${overdueCount === 1 ? 'item needs' : 'items need'} follow-through now.`;
  }
  if (dueCount > 0) {
    return `${scoreText} ${dueCount} ${dueCount === 1 ? 'item is' : 'items are'} due today.`;
  }
  return scoreText;
}

function countCompletions(item: Item, start: number, end: number) {
  return (item.completions ?? []).filter((completion) => {
    const occurredAt = new Date(completion.occurredAt).getTime();
    return !Number.isNaN(occurredAt) && occurredAt >= start && occurredAt < end;
  }).length;
}

function countScheduledOccurrences(item: Item, start: number, end: number): number {
  const schedule = item.scheduleData ?? {};
  const scheduleKind = typeof schedule.kind === 'string' ? schedule.kind : item.scheduleKind;

  if (scheduleKind === 'MULTI') {
    const schedules = Array.isArray(schedule.schedules)
      ? schedule.schedules.filter(
          (entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null,
        )
      : [];

    return schedules.reduce(
      (total, entry) =>
        total +
        countScheduledOccurrences(
          {
            ...item,
            scheduleKind: typeof entry.kind === 'string' ? (entry.kind as ScheduleKind) : item.scheduleKind,
            scheduleData: entry,
          },
          start,
          end,
        ),
      0,
    );
  }

  if (scheduleKind === 'ONE_TIME') {
    const oneTimeAt =
      typeof schedule.oneTimeAt === 'string' ? new Date(schedule.oneTimeAt).getTime() : Number.NaN;
    return !Number.isNaN(oneTimeAt) && oneTimeAt >= start && oneTimeAt < end ? 1 : 0;
  }

  if (scheduleKind === 'DAILY') {
    const times = Array.isArray(schedule.dailyTimes)
      ? schedule.dailyTimes.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      : [];
    return countDaysInWindow(start, end) * Math.max(times.length, 1);
  }

  if (scheduleKind === 'WEEKLY') {
    const weekdays = Array.isArray(schedule.weekdays)
      ? schedule.weekdays.filter((value): value is number => typeof value === 'number')
      : [];
    if (weekdays.length === 0) return 0;

    let count = 0;
    forEachDay(start, end, (date) => {
      if (weekdays.includes(date.getDay())) count += 1;
    });
    return count;
  }

  if (scheduleKind === 'INTERVAL_DAYS') {
    const intervalDays =
      typeof schedule.intervalDays === 'number' && schedule.intervalDays > 0 ? schedule.intervalDays : 1;
    const anchor =
      typeof schedule.intervalAnchor === 'string' ? new Date(schedule.intervalAnchor).getTime() : Number.NaN;
    if (Number.isNaN(anchor)) return 0;

    let count = 0;
    const intervalMs = intervalDays * DAY_MS;
    const first = anchor >= start ? anchor : anchor + Math.ceil((start - anchor) / intervalMs) * intervalMs;
    for (let next = first; next < end; next += intervalMs) {
      if (next >= start) count += 1;
    }
    return count;
  }

  const customDates = Array.isArray(schedule.customDates)
    ? schedule.customDates
        .filter((value): value is string => typeof value === 'string')
        .map((value) => new Date(value).getTime())
        .filter((value) => !Number.isNaN(value))
    : [];

  return customDates.filter((value) => value >= start && value < end).length;
}

function countDaysInWindow(start: number, end: number) {
  const startDate = new Date(start);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(0, 0, 0, 0);
  return Math.max(Math.ceil((endDate.getTime() - startDate.getTime()) / DAY_MS), 1);
}

function forEachDay(start: number, end: number, visitor: (date: Date) => void) {
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const limit = new Date(end);
  limit.setHours(0, 0, 0, 0);

  for (; cursor.getTime() < limit.getTime(); cursor.setDate(cursor.getDate() + 1)) {
    visitor(new Date(cursor));
  }
}
