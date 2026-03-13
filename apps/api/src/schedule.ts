import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { RRule } from 'rrule';
import type { Schedule } from '@leaf/shared';

dayjs.extend(utc);
dayjs.extend(timezone);

export function isDue(schedule: Schedule, at: Date): boolean {
  if (schedule.kind === 'MULTI') {
    return schedule.schedules.some((entry) => isDue(entry, at));
  }

  const now = dayjs(at).tz(schedule.timezone ?? 'UTC');

  if (schedule.kind === 'ONE_TIME') {
    if (!schedule.oneTimeAt) return false;
    const due = dayjs(schedule.oneTimeAt).tz(schedule.timezone);
    return now.isAfter(due.subtract(5, 'minute')) && now.isBefore(due.add(5, 'minute'));
  }

  if (schedule.kind === 'DAILY') {
    if (!schedule.dailyTimes || schedule.dailyTimes.length === 0) return false;
    return schedule.dailyTimes.some((time) => {
      const [hourText, minuteText] = time.split(':');
      if (!hourText || !minuteText) return false;
      const safeHour = Number(hourText);
      const safeMinute = Number(minuteText);
      if (!Number.isFinite(safeHour) || !Number.isFinite(safeMinute)) return false;
      return now.hour() === safeHour && Math.abs(now.minute() - safeMinute) <= 5;
    });
  }

  if (schedule.kind === 'WEEKLY') {
    if (!schedule.weekdays || schedule.weekdays.length === 0) return false;
    return schedule.weekdays.includes(now.day());
  }

  if (schedule.kind === 'INTERVAL_DAYS') {
    if (!schedule.intervalAnchor || !schedule.intervalDays) return false;
    const anchor = dayjs(schedule.intervalAnchor).tz(schedule.timezone);
    const rule = new RRule({
      freq: RRule.DAILY,
      interval: schedule.intervalDays,
      dtstart: anchor.toDate(),
    });

    const windowStart = now.subtract(5, 'minute').toDate();
    const windowEnd = now.add(5, 'minute').toDate();
    return rule.between(windowStart, windowEnd, true).length > 0;
  }

  if (schedule.kind === 'CUSTOM_DATES') {
    return Boolean(
      schedule.customDates?.some((entry) => dayjs(entry).tz(schedule.timezone).isSame(now, 'day')),
    );
  }

  return false;
}
