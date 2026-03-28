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

function retrospectiveTitle(kind: 'manual' | 'scheduled', subjectName: string, suffix: string) {
  const prefix = kind === 'manual' ? 'Impromptu Reflection' : 'Weekly reflection';
  return `${prefix} · ${subjectName} · ${suffix}`;
}

async function createTrackingItem(
  tx: Prisma.TransactionClient,
  ownerId: string,
  data: {
    title: string;
    category: string;
    scheduleKind: 'ONE_TIME' | 'DAILY' | 'WEEKLY' | 'INTERVAL_DAYS' | 'CUSTOM_DATES';
    scheduleData: Prisma.InputJsonValue;
    completions?: Array<{ occurredAt: string; targetAt?: string; note?: string }>;
    actions?: Array<{ kind: 'SKIP' | 'NOTE'; occurredAt: string; targetAt: string; note?: string }>;
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
            targetAt: completion.targetAt ? new Date(completion.targetAt) : undefined,
            note: completion.note,
          },
        }),
      ),
    );
  }

  if (data.actions?.length) {
    await Promise.all(
      data.actions.map((action) =>
        tx.trackingItemAction.create({
          data: {
            itemId: item.id,
            userId: ownerId,
            kind: action.kind,
            occurredAt: new Date(action.occurredAt),
            targetAt: new Date(action.targetAt),
            note: action.note,
          },
        }),
      ),
    );
  }

  return item;
}

async function createRetrospective(
  tx: Prisma.TransactionClient,
  data: {
    subjectUserId: string;
    createdById: string;
    relationId?: string;
    kind: 'manual' | 'scheduled';
    title: string;
    summaryText?: string;
    promptPreset: string;
    prompts: string[];
    audienceSummary: string;
    visibilitySummary: string;
    periodStart: string;
    periodEnd: string;
    contributions?: Array<{ authorId: string; body: string; createdAt: string }>;
  },
) {
  const retrospective = await tx.retrospective.create({
    data: {
      subjectUserId: data.subjectUserId,
      createdById: data.createdById,
      relationId: data.relationId,
      kind: data.kind,
      title: data.title,
      summaryText: data.summaryText,
      promptPreset: data.promptPreset,
      prompts: data.prompts,
      audienceSummary: data.audienceSummary,
      visibilitySummary: data.visibilitySummary,
      periodStart: new Date(data.periodStart),
      periodEnd: new Date(data.periodEnd),
    },
  });

  if (data.contributions?.length) {
    await Promise.all(
      data.contributions.map((contribution) =>
        tx.retrospectiveContribution.create({
          data: {
            retrospectiveId: retrospective.id,
            authorId: contribution.authorId,
            body: contribution.body,
            createdAt: new Date(contribution.createdAt),
          },
        }),
      ),
    );
  }

  return retrospective;
}

export async function seedDemoWorkspace(admin: UserShape, sharedPasswordHash: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: admin.id },
      data: {
        timezone: 'America/Los_Angeles',
        weeklyDigestDay: 2,
        weeklyDigestHour: 7,
        reflectionCadence: 'weekly',
        reflectionWeekday: 0,
        reflectionMonthDay: 1,
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
          reflectionCadence: 'weekly',
          reflectionWeekday: 6,
          reflectionMonthDay: 1,
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
          reflectionCadence: 'monthly',
          reflectionWeekday: 0,
          reflectionMonthDay: 3,
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
          reflectionCadence: 'daily',
          reflectionWeekday: 0,
          reflectionMonthDay: 1,
          roles: { create: [{ role: 'USER' }] },
        },
      }),
    ]);

    const [jordan, sam, morgan] = members;

    const [adminJordanRelation, adminMorganRelation, samAdminRelation] = await Promise.all([
      tx.reviewerRelation.create({
        data: {
          reviewerId: admin.id,
          revieweeId: jordan.id,
          mode: 'active',
          canActOnItems: true,
          canManageRoutines: true,
          canManageAccountability: true,
          historyWindow: 'Last 30 days + next due',
        },
      }),
      tx.reviewerRelation.create({
        data: {
          reviewerId: admin.id,
          revieweeId: morgan.id,
          mode: 'passive',
          canActOnItems: false,
          canManageRoutines: false,
          canManageAccountability: false,
          historyWindow: 'Future only',
        },
      }),
      tx.reviewerRelation.create({
        data: {
          reviewerId: sam.id,
          revieweeId: admin.id,
          mode: 'active',
          canActOnItems: true,
          canManageRoutines: false,
          canManageAccountability: true,
          historyWindow: 'Last 14 days + next due',
        },
      }),
    ]);

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
        {
          occurredAt: isoDaysFromNow(-2, 8, 3),
          targetAt: isoDaysFromNow(-2, 8, 0),
          note: 'On time before breakfast.',
        },
        {
          occurredAt: isoDaysFromNow(-1, 8, 6),
          targetAt: isoDaysFromNow(-1, 8, 0),
          note: 'Took with water.',
        },
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
      completions: [
        {
          occurredAt: isoDaysFromNow(-3, 18, 0),
          targetAt: isoDaysFromNow(-3, 12, 0),
          note: 'Short but finished.',
        },
      ],
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
      actions: [
        {
          kind: 'NOTE',
          occurredAt: isoDaysFromNow(0, 9, 15),
          targetAt: isoDaysFromNow(1, 14, 30),
          note: 'Need to pull the W-2 and mileage notes before uploading.',
        },
      ],
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
      completions: [
        {
          occurredAt: isoDaysFromNow(-1, 19, 5),
          targetAt: isoDaysFromNow(-1, 19, 0),
          note: 'Counters and table done.',
        },
      ],
      actions: [
        {
          kind: 'NOTE',
          occurredAt: isoDaysFromNow(0, 7, 45),
          targetAt: isoDaysFromNow(0, 19, 0),
          note: 'Trash night too, so reset the island first.',
        },
      ],
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
        {
          occurredAt: isoDaysFromNow(-1, 20, 4),
          targetAt: isoDaysFromNow(-1, 20, 0),
          note: 'Homework folder included.',
        },
        {
          occurredAt: isoDaysFromNow(-2, 20, 9),
          targetAt: isoDaysFromNow(-2, 20, 0),
          note: 'Added sports shoes too.',
        },
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
      completions: [
        {
          occurredAt: isoDaysFromNow(-2, 17, 2),
          targetAt: isoDaysFromNow(-2, 17, 0),
          note: 'Focused session.',
        },
      ],
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
      completions: [
        {
          occurredAt: isoDaysFromNow(-1, 13, 15),
          targetAt: isoDaysFromNow(-1, 12, 0),
          note: '20 minutes outside.',
        },
      ],
    });

    const retrospectiveSeeds = [
      {
        subjectUserId: admin.id,
        createdById: admin.id,
        relationId: samAdminRelation.id,
        kind: 'scheduled' as const,
        title: retrospectiveTitle('scheduled', admin.name, 'recent review'),
        summaryText: 'Steady health routines carried the week, but paperwork still needed a cleaner handoff before the deadline.',
        promptPreset: 'weekly-review',
        prompts: [
          'What went well this week?',
          'What felt harder than expected?',
          'What is the clearest adjustment before the next review?',
        ],
        audienceSummary: `${admin.name} and ${sam.name}`,
        visibilitySummary: `Visible to ${sam.name} and to guides whose history window still includes this review period.`,
        periodStart: isoDaysFromNow(-7, 0, 0),
        periodEnd: isoDaysFromNow(0, 0, 0),
        contributions: [
          {
            authorId: admin.id,
            body: 'Morning meds stayed steady. Paperwork still needs a cleaner handoff before deadlines.',
            createdAt: isoDaysFromNow(-1, 18, 0),
          },
          {
            authorId: sam.id,
            body: 'I can keep watching the paperwork routine and help turn the next one-time task into a shorter checklist.',
            createdAt: isoDaysFromNow(-1, 19, 0),
          },
        ],
      },
      {
        subjectUserId: admin.id,
        createdById: sam.id,
        relationId: samAdminRelation.id,
        kind: 'manual' as const,
        title: retrospectiveTitle('manual', admin.name, 'paperwork reset'),
        summaryText: 'The task was not too large, but the handoff was vague. Breaking it into a first step made it less sticky.',
        promptPreset: 'support-check-in',
        prompts: [
          'What support helped most?',
          'What slipped in this stretch?',
          'What changes next?',
        ],
        audienceSummary: `${admin.name} and ${sam.name}`,
        visibilitySummary: `Visible to ${sam.name} while the active accountability relationship still covers this period.`,
        periodStart: isoDaysFromNow(-18, 0, 0),
        periodEnd: isoDaysFromNow(-15, 0, 0),
        contributions: [
          {
            authorId: sam.id,
            body: 'We turned the packet into a first-page-only start so it felt easier to pick up.',
            createdAt: isoDaysFromNow(-15, 16, 45),
          },
          {
            authorId: admin.id,
            body: 'Starting with just the first page cut the dread enough to keep moving.',
            createdAt: isoDaysFromNow(-15, 18, 0),
          },
        ],
      },
      {
        subjectUserId: jordan.id,
        createdById: admin.id,
        relationId: adminJordanRelation.id,
        kind: 'manual' as const,
        title: retrospectiveTitle('manual', jordan.name, 'reset after missed practice'),
        summaryText: 'This was a reset after practice slipped during a packed school week. The new plan is shorter and earlier.',
        promptPreset: 'reset-and-obstacles',
        prompts: [
          'What blocked Jordan most often in this window?',
          'Which reset is realistic for the next few days?',
          'What boundary, reminder, or support change would help most?',
        ],
        audienceSummary: `${jordan.name} and ${admin.name}`,
        visibilitySummary: 'Visible while the active guide relationship keeps this period inside the shared history window.',
        periodStart: isoDaysFromNow(-4, 0, 0),
        periodEnd: isoDaysFromNow(-1, 0, 0),
        contributions: [
          {
            authorId: admin.id,
            body: 'Practice slipped after a packed school day, so we are shortening the session and moving it earlier.',
            createdAt: isoDaysFromNow(-1, 17, 30),
          },
          {
            authorId: jordan.id,
            body: 'A shorter session after snack time feels easier to restart than doing it right before bed.',
            createdAt: isoDaysFromNow(-1, 18, 10),
          },
        ],
      },
      {
        subjectUserId: jordan.id,
        createdById: jordan.id,
        relationId: adminJordanRelation.id,
        kind: 'scheduled' as const,
        title: retrospectiveTitle('scheduled', jordan.name, 'found a better rhythm'),
        summaryText: 'Earlier practice and a clearer stopping point made the routine feel less like punishment.',
        promptPreset: 'weekly-review',
        prompts: [
          'What went well this week?',
          'What felt harder than expected?',
          'What is the clearest adjustment before the next review?',
        ],
        audienceSummary: `${jordan.name} and ${admin.name}`,
        visibilitySummary: 'Visible while the active guide relationship keeps this period inside the shared history window.',
        periodStart: isoDaysFromNow(-14, 0, 0),
        periodEnd: isoDaysFromNow(-7, 0, 0),
        contributions: [
          {
            authorId: jordan.id,
            body: 'Doing practice earlier meant I still had energy, and stopping after ten minutes felt fair.',
            createdAt: isoDaysFromNow(-7, 17, 40),
          },
          {
            authorId: admin.id,
            body: 'The routine improved once the session had a clear end instead of stretching until bedtime.',
            createdAt: isoDaysFromNow(-7, 19, 0),
          },
        ],
      },
      {
        subjectUserId: morgan.id,
        createdById: morgan.id,
        relationId: adminMorganRelation.id,
        kind: 'scheduled' as const,
        title: retrospectiveTitle('scheduled', morgan.name, 'quiet consistency'),
        summaryText: 'The visible progress was light, but the walk routine stayed calmer and more repeatable than before.',
        promptPreset: 'weekly-review',
        prompts: [
          'What went well this week?',
          'What felt harder than expected?',
          'What is the clearest adjustment before the next review?',
        ],
        audienceSummary: `${morgan.name} and ${admin.name}`,
        visibilitySummary: 'Visible to passive guides when the relationship history still covers this review period.',
        periodStart: isoDaysFromNow(-11, 0, 0),
        periodEnd: isoDaysFromNow(-4, 0, 0),
        contributions: [
          {
            authorId: morgan.id,
            body: 'I did not make big changes, but walking after lunch felt calmer and easier to repeat.',
            createdAt: isoDaysFromNow(-4, 14, 0),
          },
        ],
      },
      {
        subjectUserId: morgan.id,
        createdById: admin.id,
        relationId: adminMorganRelation.id,
        kind: 'manual' as const,
        title: retrospectiveTitle('manual', morgan.name, 'quarterly paperwork checkpoint'),
        summaryText: 'A short check-in around the mileage log kept the task from turning into a last-minute scramble.',
        promptPreset: 'reset-and-obstacles',
        prompts: [
          'What blocked progress most often in this window?',
          'What reset is realistic for the next few days?',
          'What support change would help most?',
        ],
        audienceSummary: `${morgan.name} and ${admin.name}`,
        visibilitySummary: 'Visible to passive guides while the relationship history still covers this period.',
        periodStart: isoDaysFromNow(-28, 0, 0),
        periodEnd: isoDaysFromNow(-25, 0, 0),
        contributions: [
          {
            authorId: admin.id,
            body: 'We checked the mileage log early so the quarterly filing would not bunch up at the end.',
            createdAt: isoDaysFromNow(-25, 15, 15),
          },
        ],
      },
    ];

    for (const retrospective of retrospectiveSeeds) {
      await createRetrospective(tx, retrospective);
    }

  });
}
