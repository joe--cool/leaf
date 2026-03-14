import type { PageKey, SingleScheduleKind, DraftSchedule } from './appTypes';

export const weekdayOptions = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

export const categoryOptions = [
  { value: 'homework', label: 'Schoolwork' },
  { value: 'health', label: 'Medicine or supplements' },
  { value: 'exercise', label: 'Exercise' },
  { value: 'other', label: 'Other routine' },
];

export const categoryDefaultTitles: Record<string, string> = {
  homework: 'Finish math homework',
  health: 'Take evening supplement',
  exercise: 'Go for a walk',
  other: 'Water the plants',
};

export const scheduleKindOptions: Array<{
  value: SingleScheduleKind;
  label: string;
  help: string;
}> = [
  {
    value: 'DAILY',
    label: 'Every day',
    help: 'Use one or more times each day.',
  },
  {
    value: 'WEEKLY',
    label: 'Selected weekdays',
    help: 'Choose the days of the week that apply.',
  },
  {
    value: 'INTERVAL_DAYS',
    label: 'Every few days',
    help: 'Repeat after a fixed number of days.',
  },
  {
    value: 'CUSTOM_DATES',
    label: 'Specific dates',
    help: 'Hand-pick dates on the calendar.',
  },
  {
    value: 'ONE_TIME',
    label: 'One time',
    help: 'Schedule a single occurrence.',
  },
];

export const appNavItems: Array<{ key: PageKey; path: string; label: string }> = [
  { key: 'dashboard', path: '/dashboard', label: 'Overview' },
  { key: 'my-items', path: '/my-items', label: 'My Items' },
  { key: 'routines', path: '/routines', label: 'Routines' },
];

export const accountNavItems: Array<{
  key: PageKey;
  path: string;
  label: string;
  adminOnly?: boolean;
}> = [
  { key: 'profile', path: '/profile', label: 'Preferences' },
  { key: 'admin', path: '/admin', label: 'Admin', adminOnly: true },
];

export function createDraftSchedule(kind: SingleScheduleKind = 'DAILY'): DraftSchedule {
  return {
    kind,
    label: '',
    oneTimeAt: '',
    dailyTimes: ['09:00'],
    weekdays: [1, 3, 5],
    intervalDays: '2',
    intervalAnchor: '',
    customDates: [''],
  };
}
