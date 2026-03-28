import { describe, expect, it } from 'vitest';
import {
  buildScheduleFromDrafts,
  draftSchedulesFromItem,
  projectedChecksPerWeek,
} from './scheduleUtils';
import type { DraftSchedule, Item } from './appTypes';

describe('buildScheduleFromDrafts', () => {
  it('builds a single one-time schedule from draft state', () => {
    const draft: DraftSchedule = {
      kind: 'ONE_TIME',
      label: 'Refill pickup',
      oneTimeAt: '2026-03-29T16:00',
      dailyTimes: ['09:00'],
      weekdays: [1, 3, 5],
      intervalDays: '2',
      intervalAnchor: '',
      customDates: [''],
    };

    expect(buildScheduleFromDrafts([draft], 'UTC')).toEqual({
      kind: 'ONE_TIME',
      label: 'Refill pickup',
      oneTimeAt: '2026-03-29T16:00:00.000Z',
      timezone: 'UTC',
    });
  });

  it('builds a multi schedule and normalizes numeric interval values', () => {
    const drafts: DraftSchedule[] = [
      {
        kind: 'DAILY',
        label: 'Morning',
        oneTimeAt: '',
        dailyTimes: ['08:00'],
        weekdays: [1, 3, 5],
        intervalDays: '2',
        intervalAnchor: '',
        customDates: [''],
      },
      {
        kind: 'INTERVAL_DAYS',
        label: 'Stretching',
        oneTimeAt: '',
        dailyTimes: ['09:00'],
        weekdays: [1, 3, 5],
        intervalDays: '3',
        intervalAnchor: '2026-03-28T07:30',
        customDates: [''],
      },
    ];

    expect(buildScheduleFromDrafts(drafts, 'UTC')).toEqual({
      kind: 'MULTI',
      timezone: 'UTC',
      schedules: [
        {
          kind: 'DAILY',
          label: 'Morning',
          dailyTimes: ['08:00'],
          timezone: 'UTC',
        },
        {
          kind: 'INTERVAL_DAYS',
          label: 'Stretching',
          intervalDays: 3,
          intervalAnchor: '2026-03-28T07:30:00.000Z',
          timezone: 'UTC',
        },
      ],
    });
  });
});

describe('draftSchedulesFromItem', () => {
  it('restores nested multi schedules into editable drafts', () => {
    const item: Item = {
      id: 'item_1',
      title: 'Kitchen reset',
      category: 'other',
      scheduleKind: 'MULTI',
      scheduleData: {
        kind: 'MULTI',
        schedules: [
          {
            kind: 'DAILY',
            label: 'Counters',
            dailyTimes: ['19:00'],
            timezone: 'UTC',
          },
          {
            kind: 'CUSTOM_DATES',
            label: 'Deep clean',
            customDates: ['2026-03-31T18:00:00.000Z'],
            timezone: 'UTC',
          },
        ],
        timezone: 'UTC',
      },
    };

    expect(draftSchedulesFromItem(item)).toEqual([
      expect.objectContaining({
        kind: 'DAILY',
        label: 'Counters',
        dailyTimes: ['19:00'],
      }),
      expect.objectContaining({
        kind: 'CUSTOM_DATES',
        label: 'Deep clean',
        customDates: ['2026-03-31T18:00'],
      }),
    ]);
  });
});

describe('projectedChecksPerWeek', () => {
  it('adds nested multi schedule workloads together', () => {
    const item: Item = {
      id: 'item_1',
      title: 'Kitchen reset',
      category: 'other',
      scheduleKind: 'MULTI',
      scheduleData: {
        kind: 'MULTI',
        schedules: [
          { kind: 'DAILY', dailyTimes: ['08:00'], timezone: 'UTC' },
          { kind: 'WEEKLY', weekdays: [1, 5], timezone: 'UTC' },
        ],
        timezone: 'UTC',
      },
    };

    expect(projectedChecksPerWeek(item)).toBe(9);
  });
});
