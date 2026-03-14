import type { ScheduleKind } from '@leaf/shared';
import { categoryDefaultTitles, categoryOptions } from './appConstants';
import type { ActionSummary, Item, RevieweeItem } from './appTypes';

export function toInputDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function toDayName(value: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[value] ?? `Day ${value}`;
}

export function getCategoryLabel(value: string): string {
  return categoryOptions.find((option) => option.value === value)?.label ?? value;
}

export function getDefaultTitle(value: string): string {
  return categoryDefaultTitles[value] ?? 'Add routine';
}

export function summarizeSchedule(item: Item): string {
  const schedule = item.scheduleData ?? {};
  const scheduleKind = typeof schedule.kind === 'string' ? schedule.kind : item.scheduleKind;
  const scheduleLabel = typeof schedule.label === 'string' ? schedule.label.trim() : '';

  if (scheduleKind === 'MULTI') {
    const schedules = Array.isArray(schedule.schedules)
      ? schedule.schedules.filter(
          (entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null,
        )
      : [];
    if (schedules.length === 0) return 'Multiple schedules';
    const labeled = schedules
      .map((entry, index) => {
        const label = typeof entry.label === 'string' ? entry.label.trim() : '';
        const kind =
          typeof entry.kind === 'string' ? entry.kind.toLowerCase().replace('_', ' ') : 'schedule';
        return label || `Schedule ${index + 1} (${kind})`;
      })
      .slice(0, 2);
    return `${schedules.length} schedules: ${labeled.join(', ')}${schedules.length > 2 ? ', ...' : ''}`;
  }

  if (scheduleKind === 'ONE_TIME') {
    const raw = schedule.oneTimeAt;
    if (typeof raw === 'string') {
      const date = new Date(raw);
      if (!Number.isNaN(date.valueOf())) {
        return `${scheduleLabel ? `${scheduleLabel}: ` : ''}One-time ${date.toLocaleString()}`;
      }
    }
    return 'One-time event';
  }

  if (scheduleKind === 'DAILY') {
    const times = Array.isArray(schedule.dailyTimes)
      ? schedule.dailyTimes.filter((value): value is string => typeof value === 'string')
      : [];
    if (times.length > 0) {
      return `${scheduleLabel ? `${scheduleLabel}: ` : ''}Daily at ${times.slice(0, 2).join(', ')}${times.length > 2 ? ', ...' : ''}`;
    }
    return `${scheduleLabel ? `${scheduleLabel}: ` : ''}Daily`;
  }

  if (scheduleKind === 'WEEKLY') {
    const weekdays = Array.isArray(schedule.weekdays)
      ? schedule.weekdays.filter((value): value is number => typeof value === 'number')
      : [];
    if (weekdays.length > 0) {
      return `${scheduleLabel ? `${scheduleLabel}: ` : ''}Weekly on ${weekdays.map((value) => toDayName(value)).join(', ')}`;
    }
    return `${scheduleLabel ? `${scheduleLabel}: ` : ''}Weekly`;
  }

  if (scheduleKind === 'INTERVAL_DAYS') {
    const interval = schedule.intervalDays;
    if (typeof interval === 'number') {
      return `${scheduleLabel ? `${scheduleLabel}: ` : ''}Every ${interval} day${interval === 1 ? '' : 's'}`;
    }
    return `${scheduleLabel ? `${scheduleLabel}: ` : ''}Repeats by interval`;
  }

  const dates = Array.isArray(schedule.customDates)
    ? schedule.customDates.filter((value): value is string => typeof value === 'string')
    : [];
  if (dates.length > 0) {
    return `${scheduleLabel ? `${scheduleLabel}: ` : ''}${dates.length} custom schedule date${dates.length === 1 ? '' : 's'}`;
  }
  return `${scheduleLabel ? `${scheduleLabel}: ` : ''}Custom dates`;
}

export function projectedChecksPerWeek(item: Item): number {
  const schedule = item.scheduleData ?? {};
  const scheduleKind = typeof schedule.kind === 'string' ? schedule.kind : item.scheduleKind;

  if (scheduleKind === 'MULTI') {
    const schedules = Array.isArray(schedule.schedules)
      ? schedule.schedules.filter(
          (entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null,
        )
      : [];
    return schedules.reduce((total, entry) => {
      const nestedItem: Item = {
        id: item.id,
        title: item.title,
        category: item.category,
        scheduleKind:
          typeof entry.kind === 'string' ? (entry.kind as ScheduleKind) : item.scheduleKind,
        scheduleData: entry,
      };
      return total + projectedChecksPerWeek(nestedItem);
    }, 0);
  }

  if (scheduleKind === 'ONE_TIME') return 1;

  if (scheduleKind === 'DAILY') {
    const times = Array.isArray(schedule.dailyTimes)
      ? schedule.dailyTimes.filter((value): value is string => typeof value === 'string')
      : [];
    return Math.max(times.length, 1) * 7;
  }

  if (scheduleKind === 'WEEKLY') {
    const days = Array.isArray(schedule.weekdays)
      ? schedule.weekdays.filter((value): value is number => typeof value === 'number')
      : [];
    return Math.max(days.length, 1);
  }

  if (scheduleKind === 'INTERVAL_DAYS') {
    const interval = typeof schedule.intervalDays === 'number' ? schedule.intervalDays : 1;
    return Math.max(Math.round(7 / Math.max(interval, 1)), 1);
  }

  const customDates = Array.isArray(schedule.customDates)
    ? schedule.customDates.filter((value): value is string => typeof value === 'string')
    : [];
  return customDates.length;
}

function formatDateTime(value: number): string {
  return new Date(value).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function startOfToday(now: Date): Date {
  const result = new Date(now);
  result.setHours(0, 0, 0, 0);
  return result;
}

function daysUntilWeekday(currentDay: number, targetDay: number): number {
  return (targetDay - currentDay + 7) % 7;
}

export function summarizeActionableState(item: Item, now = new Date()): ActionSummary {
  const schedule = item.scheduleData ?? {};
  const scheduleKind = typeof schedule.kind === 'string' ? schedule.kind : item.scheduleKind;
  const today = startOfToday(now);
  const currentTime = now.getTime();

  if (scheduleKind === 'MULTI') {
    const schedules = Array.isArray(schedule.schedules)
      ? schedule.schedules.filter(
          (entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null,
        )
      : [];

    const nested = schedules.map((entry) =>
      summarizeActionableState(
        {
          ...item,
          scheduleKind: typeof entry.kind === 'string' ? (entry.kind as ScheduleKind) : item.scheduleKind,
          scheduleData: entry,
        },
        now,
      ),
    );

    return (
      nested.sort(
        (left, right) =>
          left.urgency !== right.urgency
            ? left.urgency - right.urgency
            : (left.dueAt ?? Number.MAX_SAFE_INTEGER) - (right.dueAt ?? Number.MAX_SAFE_INTEGER),
      )[0] ?? {
        bucket: 'later',
        urgency: 5,
        status: 'Needs schedule review',
        detail: 'This routine has multiple schedules but none are configured yet.',
      }
    );
  }

  if (scheduleKind === 'ONE_TIME') {
    const raw = typeof schedule.oneTimeAt === 'string' ? schedule.oneTimeAt : '';
    const dueAt = raw ? new Date(raw).getTime() : Number.NaN;
    if (!Number.isNaN(dueAt)) {
      if (dueAt < currentTime) {
        return {
          bucket: 'due',
          urgency: 0,
          status: 'Overdue',
          detail: `Scheduled for ${formatDateTime(dueAt)}.`,
          dueAt,
        };
      }
      return {
        bucket: 'upcoming',
        urgency: dueAt - currentTime < 1000 * 60 * 60 * 24 ? 1 : 2,
        status: 'Scheduled next',
        detail: `Due ${formatDateTime(dueAt)}.`,
        dueAt,
      };
    }
  }

  if (scheduleKind === 'DAILY') {
    const times = Array.isArray(schedule.dailyTimes)
      ? schedule.dailyTimes.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      : [];
    if (times.length > 0) {
      return {
        bucket: 'due',
        urgency: 1,
        status: 'Due today',
        detail: `${times.length} check${times.length === 1 ? '' : 's'} scheduled today.`,
      };
    }
    return {
      bucket: 'due',
      urgency: 2,
      status: 'Due today',
      detail: 'This routine repeats every day.',
    };
  }

  if (scheduleKind === 'WEEKLY') {
    const weekdays = Array.isArray(schedule.weekdays)
      ? schedule.weekdays.filter((value): value is number => typeof value === 'number')
      : [];
    if (weekdays.length > 0) {
      if (weekdays.includes(now.getDay())) {
        return {
          bucket: 'due',
          urgency: 1,
          status: 'Due today',
          detail: 'Today is one of the selected routine days.',
        };
      }
      const nextDay = weekdays
        .map((day) => ({ day, diff: daysUntilWeekday(now.getDay(), day) }))
        .sort((left, right) => left.diff - right.diff)[0];
      if (nextDay) {
        return {
          bucket: 'upcoming',
          urgency: nextDay.diff <= 2 ? 2 : 3,
          status: 'Coming up',
          detail: `Next due ${toDayName(nextDay.day)}.`,
        };
      }
    }
  }

  if (scheduleKind === 'INTERVAL_DAYS') {
    const interval = typeof schedule.intervalDays === 'number' ? Math.max(schedule.intervalDays, 1) : 1;
    const rawAnchor = typeof schedule.intervalAnchor === 'string' ? schedule.intervalAnchor : '';
    const anchorDate = rawAnchor ? new Date(rawAnchor) : today;
    const anchorTime = anchorDate.getTime();

    if (!Number.isNaN(anchorTime)) {
      const intervalMs = interval * 24 * 60 * 60 * 1000;
      const elapsed = Math.max(currentTime - anchorTime, 0);
      const cycles = Math.floor(elapsed / intervalMs);
      const nextDueAt = anchorTime + cycles * intervalMs;
      const followingDueAt = nextDueAt < currentTime ? nextDueAt + intervalMs : nextDueAt;

      if (nextDueAt <= currentTime && now.toDateString() === new Date(nextDueAt).toDateString()) {
        return {
          bucket: 'due',
          urgency: 1,
          status: 'Due today',
          detail: `Repeats every ${interval} day${interval === 1 ? '' : 's'}.`,
          dueAt: nextDueAt,
        };
      }

      return {
        bucket: 'upcoming',
        urgency: followingDueAt - currentTime < intervalMs ? 2 : 3,
        status: 'Coming up',
        detail: `Next due ${formatDateTime(followingDueAt)}.`,
        dueAt: followingDueAt,
      };
    }
  }

  const customDates = Array.isArray(schedule.customDates)
    ? schedule.customDates
        .filter((value): value is string => typeof value === 'string')
        .map((value) => new Date(value).getTime())
        .filter((value) => !Number.isNaN(value))
        .sort((left, right) => left - right)
    : [];

  if (customDates.length > 0) {
    const dueTodayDate = customDates.find((value) => value >= today.getTime() && value <= currentTime);
    if (dueTodayDate) {
      return {
        bucket: 'due',
        urgency: 0,
        status: 'Due today',
        detail: `Scheduled for ${formatDateTime(dueTodayDate)}.`,
        dueAt: dueTodayDate,
      };
    }
    const upcomingDate = customDates.find((value) => value >= currentTime);
    if (upcomingDate) {
      return {
        bucket: 'upcoming',
        urgency: upcomingDate - currentTime < 1000 * 60 * 60 * 24 * 3 ? 2 : 3,
        status: 'Scheduled next',
        detail: `Next on ${formatDateTime(upcomingDate)}.`,
        dueAt: upcomingDate,
      };
    }
  }

  return {
    bucket: 'later',
    urgency: 4,
    status: 'Needs routine review',
    detail: 'Open Routines to confirm the cadence and reminder settings.',
  };
}

export function summarizeRecentRevieweeActivity(items: RevieweeItem[]) {
  return items
    .flatMap((item) =>
      item.completions.map((completion) => ({
        id: completion.id,
        itemTitle: item.title,
        occurredAt: completion.occurredAt,
        note: completion.note,
      })),
    )
    .filter((entry) => !Number.isNaN(new Date(entry.occurredAt).valueOf()))
    .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())
    .slice(0, 3);
}
