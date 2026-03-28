import type { Schedule, ScheduleKind, SingleSchedule } from '@leaf/shared';
import { categoryDefaultTitles, categoryOptions } from './appConstants';
import { createDraftSchedule } from './appConstants';
import type { ActionSummary, DraftSchedule, Item, MemberItem } from './appTypes';

export function toInputDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function defaultOneTimeDate(daysFromNow = 1, hours = 17, minutes = 0, now = new Date()): string {
  const result = new Date(now);
  result.setDate(result.getDate() + daysFromNow);
  result.setHours(hours, minutes, 0, 0);
  return toInputDateTime(result);
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

function normalizeDateTimeForInput(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return '';
  return toInputDateTime(parsed);
}

function parseScheduleDraft(schedule: Record<string, unknown>): DraftSchedule {
  const kind = typeof schedule.kind === 'string' ? schedule.kind : 'DAILY';
  const base = createDraftSchedule(kind === 'MULTI' ? 'DAILY' : (kind as DraftSchedule['kind']));
  return {
    ...base,
    kind: base.kind,
    label: typeof schedule.label === 'string' ? schedule.label : '',
    oneTimeAt: normalizeDateTimeForInput(schedule.oneTimeAt),
    dailyTimes: Array.isArray(schedule.dailyTimes)
      ? schedule.dailyTimes.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      : base.dailyTimes,
    weekdays: Array.isArray(schedule.weekdays)
      ? schedule.weekdays.filter((value): value is number => Number.isInteger(value) && value >= 0 && value <= 6)
      : base.weekdays,
    intervalDays:
      typeof schedule.intervalDays === 'number' && Number.isFinite(schedule.intervalDays)
        ? String(schedule.intervalDays)
        : base.intervalDays,
    intervalAnchor: normalizeDateTimeForInput(schedule.intervalAnchor),
    customDates: Array.isArray(schedule.customDates)
      ? schedule.customDates
          .map((value) => normalizeDateTimeForInput(value))
          .filter((value) => value.trim().length > 0)
      : base.customDates,
  };
}

function buildSingleSchedule(draft: DraftSchedule, timezone: string): SingleSchedule {
  const label = draft.label.trim() || undefined;

  if (draft.kind === 'ONE_TIME') {
    const oneTimeDate = draft.oneTimeAt ? new Date(draft.oneTimeAt) : new Date();
    return { kind: 'ONE_TIME', label, oneTimeAt: oneTimeDate.toISOString(), timezone };
  }
  if (draft.kind === 'DAILY') {
    return {
      kind: 'DAILY',
      label,
      dailyTimes: draft.dailyTimes.map((value) => value.trim()).filter(Boolean),
      timezone,
    };
  }
  if (draft.kind === 'WEEKLY') {
    return {
      kind: 'WEEKLY',
      label,
      weekdays: draft.weekdays.filter((value) => Number.isInteger(value) && value >= 0 && value <= 6),
      timezone,
    };
  }
  if (draft.kind === 'INTERVAL_DAYS') {
    return {
      kind: 'INTERVAL_DAYS',
      label,
      intervalDays: Math.max(Number(draft.intervalDays) || 1, 1),
      intervalAnchor: new Date(draft.intervalAnchor || new Date().toISOString()).toISOString(),
      timezone,
    };
  }
  return {
    kind: 'CUSTOM_DATES',
    label,
    customDates: draft.customDates
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => new Date(value).toISOString()),
    timezone,
  };
}

export function buildScheduleFromDrafts(draftSchedules: DraftSchedule[], timezone: string): Schedule {
  const schedules = draftSchedules.map((draft) => buildSingleSchedule(draft, timezone));
  if (schedules.length === 1) return schedules[0]!;
  return { kind: 'MULTI', schedules, timezone };
}

export function draftSchedulesFromItem(item: Item): DraftSchedule[] {
  const schedule = item.scheduleData ?? {};
  const scheduleKind = typeof schedule.kind === 'string' ? schedule.kind : item.scheduleKind;

  if (scheduleKind === 'MULTI' && Array.isArray(schedule.schedules)) {
    const schedules = schedule.schedules
      .filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null)
      .map(parseScheduleDraft);
    if (schedules.length > 0) return schedules;
  }

  return [parseScheduleDraft({ ...schedule, kind: scheduleKind })];
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

function startOfDayAt(day: Date, hours = 12, minutes = 0): Date {
  const result = new Date(day);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function daysUntilWeekday(currentDay: number, targetDay: number): number {
  return (targetDay - currentDay + 7) % 7;
}

function normalizeTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return null;
  return parsed.toISOString();
}

function isSameLocalDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function completionMatchesTarget(item: Item, targetAt: string): boolean {
  const normalizedTarget = normalizeTimestamp(targetAt);
  if (!normalizedTarget) return false;
  const targetDate = new Date(normalizedTarget);

  return (item.completions ?? []).some((completion) => {
    const explicitTarget = normalizeTimestamp(completion.targetAt ?? undefined);
    if (explicitTarget) return explicitTarget === normalizedTarget;

    const occurredAt = normalizeTimestamp(completion.occurredAt);
    if (!occurredAt) return false;
    return isSameLocalDay(new Date(occurredAt), targetDate);
  });
}

function skipMatchesTarget(item: Item, targetAt: string): boolean {
  const normalizedTarget = normalizeTimestamp(targetAt);
  if (!normalizedTarget) return false;
  return (item.actions ?? []).some(
    (entry) => entry.kind === 'skip' && normalizeTimestamp(entry.targetAt) === normalizedTarget,
  );
}

function noteForTarget(item: Item, targetAt: string): string | null {
  return noteDetailsForTarget(item, targetAt)?.note ?? null;
}

function noteDetailsForTarget(item: Item, targetAt: string): { note: string; actorName?: string } | null {
  const normalizedTarget = normalizeTimestamp(targetAt);
  if (!normalizedTarget) return null;

  const candidateNotes = [
    ...(item.actions ?? [])
      .filter((entry) => entry.kind === 'note' && normalizeTimestamp(entry.targetAt) === normalizedTarget)
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
      .flatMap((entry) => {
        const note = entry.note?.trim();
        return note ? [{ note, actorName: entry.actorName }] : [];
      }),
    ...(item.completions ?? [])
      .filter((entry) => {
        const explicitTarget = normalizeTimestamp(entry.targetAt ?? undefined);
        if (explicitTarget) return explicitTarget === normalizedTarget;
        const occurredAt = normalizeTimestamp(entry.occurredAt);
        return occurredAt ? isSameLocalDay(new Date(occurredAt), new Date(normalizedTarget)) : false;
      })
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
      .flatMap((entry) => {
        const note = entry.note?.trim();
        return note ? [{ note, actorName: entry.actorName }] : [];
      }),
  ];

  return candidateNotes[0] ?? null;
}

export function summarizeOccurrenceNote(item: Item, occurrenceAt?: string): string | null {
  return occurrenceAt ? noteForTarget(item, occurrenceAt) : null;
}

export function summarizeOccurrenceNoteDetails(
  item: Item,
  occurrenceAt?: string,
): { note: string; actorName?: string } | null {
  return occurrenceAt ? noteDetailsForTarget(item, occurrenceAt) : null;
}

function resolveTimeParts(value: string | undefined, fallbackHours = 12, fallbackMinutes = 0) {
  if (!value) return { hours: fallbackHours, minutes: fallbackMinutes };
  const [rawHours, rawMinutes] = value.split(':');
  const hours = Number(rawHours);
  const minutes = Number(rawMinutes);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return { hours: fallbackHours, minutes: fallbackMinutes };
  }
  return { hours, minutes };
}

function buildResolvedSummary(base: ActionSummary, item: Item): ActionSummary {
  const occurrenceAt = base.occurrenceAt;
  if (!occurrenceAt) return base;

  if (completionMatchesTarget(item, occurrenceAt)) {
    return {
      ...base,
      bucket: 'later',
      urgency: 4,
      status: 'Completed',
      detail: 'This occurrence is already complete.',
    };
  }

  if (skipMatchesTarget(item, occurrenceAt)) {
    return {
      ...base,
      bucket: 'later',
      urgency: 4,
      status: 'Skipped',
      detail: 'This occurrence was skipped and moved out of the active queue.',
    };
  }

  return base;
}

function nextUnresolvedSummary(primary: ActionSummary, fallback: ActionSummary | null, item: Item): ActionSummary {
  const resolvedPrimary = buildResolvedSummary(primary, item);
  if (resolvedPrimary.bucket !== 'later' || !fallback) return resolvedPrimary;

  const resolvedFallback = buildResolvedSummary(fallback, item);
  return resolvedFallback.bucket === 'later' ? resolvedPrimary : resolvedFallback;
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
      const occurrenceAt = new Date(dueAt).toISOString();
      const base: ActionSummary =
        dueAt < currentTime
          ? {
              bucket: 'due',
              urgency: 0,
              status: 'Overdue',
              detail: `Scheduled for ${formatDateTime(dueAt)}.`,
              dueAt,
              occurrenceAt,
            }
          : {
              bucket: 'upcoming',
              urgency: dueAt - currentTime < 1000 * 60 * 60 * 24 ? 1 : 2,
              status: 'Scheduled next',
              detail: `Due ${formatDateTime(dueAt)}.`,
              dueAt,
              occurrenceAt,
            };
      return buildResolvedSummary(base, item);
    }
  }

  if (scheduleKind === 'DAILY') {
    const times = Array.isArray(schedule.dailyTimes)
      ? schedule.dailyTimes.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      : [];
    const firstTime = resolveTimeParts(times[0]);
    const todayOccurrenceAt = startOfDayAt(today, firstTime.hours, firstTime.minutes).toISOString();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowOccurrenceAt = startOfDayAt(tomorrow, firstTime.hours, firstTime.minutes).toISOString();

    if (times.length > 0) {
      return nextUnresolvedSummary(
        {
          bucket: 'due',
          urgency: 1,
          status: 'Due today',
          detail: `${times.length} check${times.length === 1 ? '' : 's'} scheduled today.`,
          occurrenceAt: todayOccurrenceAt,
          dueAt: new Date(todayOccurrenceAt).getTime(),
        },
        {
          bucket: 'upcoming',
          urgency: 2,
          status: 'Coming up',
          detail: `Next due ${formatDateTime(new Date(tomorrowOccurrenceAt).getTime())}.`,
          occurrenceAt: tomorrowOccurrenceAt,
          dueAt: new Date(tomorrowOccurrenceAt).getTime(),
        },
        item,
      );
    }
    return nextUnresolvedSummary(
      {
        bucket: 'due',
        urgency: 2,
        status: 'Due today',
        detail: 'This routine repeats every day.',
        occurrenceAt: todayOccurrenceAt,
        dueAt: new Date(todayOccurrenceAt).getTime(),
      },
      {
        bucket: 'upcoming',
        urgency: 2,
        status: 'Coming up',
        detail: `Next due ${formatDateTime(new Date(tomorrowOccurrenceAt).getTime())}.`,
        occurrenceAt: tomorrowOccurrenceAt,
        dueAt: new Date(tomorrowOccurrenceAt).getTime(),
      },
      item,
    );
  }

  if (scheduleKind === 'WEEKLY') {
    const weekdays = Array.isArray(schedule.weekdays)
      ? schedule.weekdays.filter((value): value is number => typeof value === 'number')
      : [];
    if (weekdays.length > 0) {
      if (weekdays.includes(now.getDay())) {
        const todayOccurrenceAt = startOfDayAt(today).toISOString();
        const nextWeekday = weekdays
          .map((day) => ({ day, diff: daysUntilWeekday((now.getDay() + 1) % 7, day) + 1 }))
          .sort((left, right) => left.diff - right.diff)[0];
        const nextDate = new Date(today);
        nextDate.setDate(nextDate.getDate() + (nextWeekday?.diff ?? 7));
        const nextOccurrenceAt = startOfDayAt(nextDate).toISOString();

        return nextUnresolvedSummary(
          {
            bucket: 'due',
            urgency: 1,
            status: 'Due today',
            detail: 'Today is one of the selected routine days.',
            occurrenceAt: todayOccurrenceAt,
            dueAt: new Date(todayOccurrenceAt).getTime(),
          },
          {
            bucket: 'upcoming',
            urgency: 2,
            status: 'Coming up',
            detail: `Next due ${toDayName(nextDate.getDay())}.`,
            occurrenceAt: nextOccurrenceAt,
            dueAt: new Date(nextOccurrenceAt).getTime(),
          },
          item,
        );
      }
      const nextDay = weekdays
        .map((day) => ({ day, diff: daysUntilWeekday(now.getDay(), day) }))
        .sort((left, right) => left.diff - right.diff)[0];
      if (nextDay) {
        const nextDate = new Date(today);
        nextDate.setDate(nextDate.getDate() + nextDay.diff);
        const nextOccurrenceAt = startOfDayAt(nextDate).toISOString();
        return {
          bucket: 'upcoming',
          urgency: nextDay.diff <= 2 ? 2 : 3,
          status: 'Coming up',
          detail: `Next due ${toDayName(nextDay.day)}.`,
          occurrenceAt: nextOccurrenceAt,
          dueAt: new Date(nextOccurrenceAt).getTime(),
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
        return nextUnresolvedSummary(
          {
            bucket: 'due',
            urgency: 1,
            status: 'Due today',
            detail: `Repeats every ${interval} day${interval === 1 ? '' : 's'}.`,
            dueAt: nextDueAt,
            occurrenceAt: new Date(nextDueAt).toISOString(),
          },
          {
            bucket: 'upcoming',
            urgency: 2,
            status: 'Coming up',
            detail: `Next due ${formatDateTime(followingDueAt)}.`,
            dueAt: followingDueAt,
            occurrenceAt: new Date(followingDueAt).toISOString(),
          },
          item,
        );
      }

      return {
        bucket: 'upcoming',
        urgency: followingDueAt - currentTime < intervalMs ? 2 : 3,
        status: 'Coming up',
        detail: `Next due ${formatDateTime(followingDueAt)}.`,
        dueAt: followingDueAt,
        occurrenceAt: new Date(followingDueAt).toISOString(),
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
    const dueOrPastDate = customDates.find((value) => value <= currentTime);
    if (dueOrPastDate) {
      const base = {
        bucket: 'due',
        urgency: dueOrPastDate < today.getTime() ? 0 : 1,
        status: dueOrPastDate < today.getTime() ? 'Overdue' : 'Due today',
        detail: `Scheduled for ${formatDateTime(dueOrPastDate)}.`,
        dueAt: dueOrPastDate,
        occurrenceAt: new Date(dueOrPastDate).toISOString(),
      } satisfies ActionSummary;
      const futureDate = customDates.find((value) => value > currentTime) ?? null;
      return nextUnresolvedSummary(
        base,
        futureDate
          ? {
              bucket: 'upcoming',
              urgency: futureDate - currentTime < 1000 * 60 * 60 * 24 * 3 ? 2 : 3,
              status: 'Scheduled next',
              detail: `Next on ${formatDateTime(futureDate)}.`,
              dueAt: futureDate,
              occurrenceAt: new Date(futureDate).toISOString(),
            }
          : null,
        item,
      );
    }
    const upcomingDate = customDates.find((value) => value >= currentTime);
    if (upcomingDate) {
      return {
        bucket: 'upcoming',
        urgency: upcomingDate - currentTime < 1000 * 60 * 60 * 24 * 3 ? 2 : 3,
        status: 'Scheduled next',
        detail: `Next on ${formatDateTime(upcomingDate)}.`,
        dueAt: upcomingDate,
        occurrenceAt: new Date(upcomingDate).toISOString(),
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

export function summarizeRecentRevieweeActivity(items: MemberItem[]) {
  return items
    .flatMap((item) =>
      (item.completions ?? []).map((completion: MemberItem['completions'][number]) => ({
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

export function summarizeRecentMemberContext(items: MemberItem[]) {
  return items
    .flatMap((item) => [
      ...(item.completions ?? []).map((completion) => ({
        id: `completion-${completion.id}`,
        itemTitle: item.title,
        occurredAt: completion.occurredAt,
        note: completion.note,
        actorName: completion.actorName,
        kind: 'complete' as const,
      })),
      ...(item.actions ?? []).map((action) => ({
        id: `action-${action.id}`,
        itemTitle: item.title,
        occurredAt: action.occurredAt,
        note: action.note,
        actorName: action.actorName,
        kind: action.kind,
      })),
    ])
    .filter((entry) => !Number.isNaN(new Date(entry.occurredAt).valueOf()))
    .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())
    .slice(0, 6);
}
