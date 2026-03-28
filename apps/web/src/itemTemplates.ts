import { createDraftSchedule } from './appConstants';
import { defaultOneTimeDate } from './scheduleUtils';
import type { DraftSchedule, ItemCreationMode } from './appTypes';

export type ItemTemplateId = 'school' | 'medication' | 'exercise' | 'chores' | 'accountability' | 'scratch';

type ItemTemplateOption = {
  id: Exclude<ItemTemplateId, 'scratch'>;
  label: string;
  category: string;
  description: string;
  recurring: {
    title: string;
    schedule: DraftSchedule;
  };
  oneTime: {
    title: string;
    schedule: DraftSchedule;
  };
};

export const itemTemplateOptions: ItemTemplateOption[] = [
  {
    id: 'school',
    label: 'School',
    category: 'homework',
    description: 'Assignments, reading, and class prep.',
    recurring: {
      title: 'Homework check-in',
      schedule: {
        ...createDraftSchedule('WEEKLY'),
        weekdays: [1, 2, 3, 4, 5],
        label: 'School days',
      },
    },
    oneTime: {
      title: 'Turn in assignment',
      schedule: {
        ...createDraftSchedule('ONE_TIME'),
        oneTimeAt: defaultOneTimeDate(1, 16, 0),
      },
    },
  },
  {
    id: 'medication',
    label: 'Medication',
    category: 'health',
    description: 'Medicine, supplements, and health check-ins.',
    recurring: {
      title: 'Take evening supplement',
      schedule: {
        ...createDraftSchedule('DAILY'),
        dailyTimes: ['20:00'],
      },
    },
    oneTime: {
      title: 'Pick up prescription refill',
      schedule: {
        ...createDraftSchedule('ONE_TIME'),
        oneTimeAt: defaultOneTimeDate(1, 15, 30),
      },
    },
  },
  {
    id: 'exercise',
    label: 'Exercise',
    category: 'exercise',
    description: 'Movement, training, or recovery routines.',
    recurring: {
      title: 'Go for a walk',
      schedule: {
        ...createDraftSchedule('WEEKLY'),
        weekdays: [1, 3, 5],
        label: 'Movement days',
      },
    },
    oneTime: {
      title: 'Attend workout session',
      schedule: {
        ...createDraftSchedule('ONE_TIME'),
        oneTimeAt: defaultOneTimeDate(2, 18, 0),
      },
    },
  },
  {
    id: 'chores',
    label: 'Chores',
    category: 'other',
    description: 'Household responsibilities and recurring upkeep.',
    recurring: {
      title: 'Take out the trash',
      schedule: {
        ...createDraftSchedule('WEEKLY'),
        weekdays: [2, 5],
        label: 'Pickup days',
      },
    },
    oneTime: {
      title: 'Reset bedroom before guests',
      schedule: {
        ...createDraftSchedule('ONE_TIME'),
        oneTimeAt: defaultOneTimeDate(3, 17, 0),
      },
    },
  },
  {
    id: 'accountability',
    label: 'General accountability',
    category: 'other',
    description: 'Catch-all follow-through and personal commitments.',
    recurring: {
      title: 'End-of-day check-in',
      schedule: {
        ...createDraftSchedule('DAILY'),
        dailyTimes: ['18:00'],
      },
    },
    oneTime: {
      title: 'Handle this commitment',
      schedule: {
        ...createDraftSchedule('ONE_TIME'),
        oneTimeAt: defaultOneTimeDate(1, 17, 30),
      },
    },
  },
];

export function resolveTemplateDraft(
  templateId: ItemTemplateId,
  mode: ItemCreationMode,
): {
  category: string;
  title: string;
  draftSchedules: DraftSchedule[];
} {
  if (templateId === 'scratch') {
    return {
      category: mode === 'one-time' ? 'other' : 'health',
      title: mode === 'one-time' ? 'Handle this once' : 'Take evening supplement',
      draftSchedules: [
        mode === 'one-time'
          ? {
              ...createDraftSchedule('ONE_TIME'),
              oneTimeAt: defaultOneTimeDate(1, 17, 0),
            }
          : createDraftSchedule('DAILY'),
      ],
    };
  }

  const template = itemTemplateOptions.find((option) => option.id === templateId) ?? itemTemplateOptions[1]!;
  const variant = mode === 'one-time' ? template.oneTime : template.recurring;
  return {
    category: template.category,
    title: variant.title,
    draftSchedules: [{ ...variant.schedule }],
  };
}
