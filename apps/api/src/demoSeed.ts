import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

type UserShape = {
  id: string;
  email: string;
  name: string;
};

function isoDaysFromNow(days: number, hour = 9, minute = 0): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hour, minute, 0, 0);
  return date.toISOString();
}

async function createTrackingItem(
  tx: Prisma.TransactionClient,
  ownerId: string,
  data: {
    title: string;
    category: string;
    scheduleKind: 'ONE_TIME' | 'DAILY' | 'WEEKLY' | 'INTERVAL_DAYS' | 'CUSTOM_DATES';
    scheduleData: Prisma.InputJsonValue;
    completions?: Array<{ occurredAt: string; note?: string }>;
    notificationHardToDismiss?: boolean;
    notificationRepeatMinutes?: number;
  },
) {
  const item = await tx.trackingItem.create({
    data: {
      ownerId,
      title: data.title,
      category: data.category,
      scheduleKind: data.scheduleKind,
      scheduleData: data.scheduleData,
      notificationEnabled: true,
      notificationHardToDismiss: data.notificationHardToDismiss ?? false,
      notificationRepeatMinutes: data.notificationRepeatMinutes ?? 15,
    },
  });

  if (data.completions?.length) {
    await Promise.all(
      data.completions.map((completion) =>
        tx.trackingCompletion.create({
          data: {
            itemId: item.id,
            userId: ownerId,
            occurredAt: new Date(completion.occurredAt),
            note: completion.note,
          },
        }),
      ),
    );
  }

  return item;
}

export async function seedDemoWorkspace(admin: UserShape, sharedPasswordHash: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: admin.id },
      data: {
        timezone: 'America/Los_Angeles',
        weeklyDigestDay: 2,
        weeklyDigestHour: 7,
      },
    });

    const members = await Promise.all([
      tx.user.create({
        data: {
          email: 'jordan.ellis@example.com',
          name: 'Jordan Ellis',
          passwordHash: sharedPasswordHash,
          timezone: 'America/Los_Angeles',
          weeklyDigestDay: 1,
          weeklyDigestHour: 8,
          roles: { create: [{ role: 'USER' }] },
        },
      }),
      tx.user.create({
        data: {
          email: 'sam.carter@example.com',
          name: 'Sam Carter',
          passwordHash: sharedPasswordHash,
          timezone: 'America/Chicago',
          weeklyDigestDay: 4,
          weeklyDigestHour: 6,
          roles: { create: [{ role: 'USER' }] },
        },
      }),
      tx.user.create({
        data: {
          email: 'morgan.bennett@example.com',
          name: 'Morgan Bennett',
          passwordHash: sharedPasswordHash,
          timezone: 'America/New_York',
          weeklyDigestDay: 0,
          weeklyDigestHour: 9,
          roles: { create: [{ role: 'USER' }] },
        },
      }),
    ]);

    const [jordan, sam, morgan] = members;

    await tx.reviewerRelation.createMany({
      data: [
        {
          reviewerId: admin.id,
          revieweeId: jordan.id,
          mode: 'active',
          canActOnItems: true,
          canManageRoutines: true,
          canManageAccountability: true,
          historyWindow: 'Last 30 days + next due',
        },
        {
          reviewerId: admin.id,
          revieweeId: morgan.id,
          mode: 'passive',
          canActOnItems: false,
          canManageRoutines: false,
          canManageAccountability: false,
          historyWindow: 'Future only',
        },
        {
          reviewerId: sam.id,
          revieweeId: admin.id,
          mode: 'active',
          canActOnItems: true,
          canManageRoutines: false,
          canManageAccountability: true,
          historyWindow: 'Last 14 days + next due',
        },
      ],
    });

    await createTrackingItem(tx, admin.id, {
      title: 'Morning medication check',
      category: 'health',
      scheduleKind: 'DAILY',
      scheduleData: {
        kind: 'DAILY',
        label: 'Morning meds',
        dailyTimes: ['08:00'],
        timezone: 'America/Los_Angeles',
      },
      completions: [
        { occurredAt: isoDaysFromNow(-2, 8, 3), note: 'On time before breakfast.' },
        { occurredAt: isoDaysFromNow(-1, 8, 6), note: 'Took with water.' },
      ],
      notificationHardToDismiss: true,
      notificationRepeatMinutes: 10,
    });

    await createTrackingItem(tx, admin.id, {
      title: 'PT stretch block',
      category: 'exercise',
      scheduleKind: 'WEEKLY',
      scheduleData: {
        kind: 'WEEKLY',
        label: 'Mobility',
        weekdays: [1, 3, 5],
        timezone: 'America/Los_Angeles',
      },
      completions: [{ occurredAt: isoDaysFromNow(-3, 18, 0), note: 'Short but finished.' }],
    });

    await createTrackingItem(tx, admin.id, {
      title: 'Upload tax packet',
      category: 'paperwork',
      scheduleKind: 'ONE_TIME',
      scheduleData: {
        kind: 'ONE_TIME',
        label: 'Tax packet',
        oneTimeAt: isoDaysFromNow(1, 14, 30),
        timezone: 'America/Los_Angeles',
      },
    });

    await createTrackingItem(tx, admin.id, {
      title: 'Keep the kitchen reset',
      category: 'chores',
      scheduleKind: 'DAILY',
      scheduleData: {
        kind: 'MULTI',
        timezone: 'America/Los_Angeles',
        schedules: [
          {
            kind: 'DAILY',
            label: 'Counters',
            dailyTimes: ['19:00'],
            timezone: 'America/Los_Angeles',
          },
          {
            kind: 'WEEKLY',
            label: 'Fridge sweep',
            weekdays: [0],
            timezone: 'America/Los_Angeles',
          },
        ],
      },
      completions: [{ occurredAt: isoDaysFromNow(-1, 19, 5), note: 'Counters and table done.' }],
    });

    await createTrackingItem(tx, jordan.id, {
      title: 'Pack school bag',
      category: 'schoolwork',
      scheduleKind: 'DAILY',
      scheduleData: {
        kind: 'DAILY',
        label: 'Night before',
        dailyTimes: ['20:00'],
        timezone: 'America/Los_Angeles',
      },
      completions: [
        { occurredAt: isoDaysFromNow(-1, 20, 4), note: 'Homework folder included.' },
        { occurredAt: isoDaysFromNow(-2, 20, 9), note: 'Added sports shoes too.' },
      ],
    });

    await createTrackingItem(tx, jordan.id, {
      title: 'Speech practice',
      category: 'exercise',
      scheduleKind: 'INTERVAL_DAYS',
      scheduleData: {
        kind: 'INTERVAL_DAYS',
        label: '10 minute session',
        intervalDays: 2,
        intervalAnchor: isoDaysFromNow(-4, 17, 0),
        timezone: 'America/Los_Angeles',
      },
      completions: [{ occurredAt: isoDaysFromNow(-2, 17, 2), note: 'Focused session.' }],
    });

    await createTrackingItem(tx, morgan.id, {
      title: 'Submit mileage log',
      category: 'paperwork',
      scheduleKind: 'CUSTOM_DATES',
      scheduleData: {
        kind: 'CUSTOM_DATES',
        label: 'Quarterly filing',
        customDates: [isoDaysFromNow(-1, 12, 0), isoDaysFromNow(6, 12, 0)],
        timezone: 'America/New_York',
      },
    });

    await createTrackingItem(tx, morgan.id, {
      title: 'Walk after lunch',
      category: 'exercise',
      scheduleKind: 'WEEKLY',
      scheduleData: {
        kind: 'WEEKLY',
        label: 'Fresh air',
        weekdays: [1, 2, 4],
        timezone: 'America/New_York',
      },
      completions: [{ occurredAt: isoDaysFromNow(-1, 13, 15), note: '20 minutes outside.' }],
    });
  });
}
