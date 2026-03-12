import { describe, expect, it } from 'vitest';
import { scheduleSchema } from './index';

describe('scheduleSchema', () => {
  it('parses a daily schedule', () => {
    const parsed = scheduleSchema.parse({
      kind: 'DAILY',
      label: 'Morning',
      dailyTimes: ['08:00'],
      timezone: 'America/Los_Angeles',
    });

    expect(parsed.kind).toBe('DAILY');
    if (parsed.kind !== 'DAILY') {
      throw new Error('Expected DAILY schedule');
    }
    expect(parsed.dailyTimes?.[0]).toBe('08:00');
    expect(parsed.label).toBe('Morning');
  });

  it('parses multi schedule payloads', () => {
    const parsed = scheduleSchema.parse({
      kind: 'MULTI',
      schedules: [
        { kind: 'DAILY', dailyTimes: ['08:00'], timezone: 'UTC' },
        { kind: 'WEEKLY', weekdays: [1, 3, 5], timezone: 'UTC' },
      ],
      timezone: 'UTC',
    });

    expect(parsed.kind).toBe('MULTI');
    if (parsed.kind !== 'MULTI') {
      throw new Error('Expected MULTI schedule');
    }
    expect(parsed.schedules).toHaveLength(2);
  });
});
