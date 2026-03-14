import { buildAccountabilitySummary } from './accountabilityUtils';
import type { Item, MemberPortfolio, RetrospectiveEntry, User } from './appTypes';

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_COUNT = 4;

type RetrospectiveContext = {
  key: string;
  subjectName: string;
  titlePrefix: string;
  audience: string;
  visibility: string;
  items: Item[];
  relationshipCreatedAt?: string;
};

export function buildRetrospectiveEntries(
  user: User,
  items: Item[],
  memberPortfolios: MemberPortfolio[],
  now = new Date(),
): RetrospectiveEntry[] {
  const contexts: RetrospectiveContext[] = [
    {
      key: `self-${user.id}`,
      subjectName: user.name,
      titlePrefix: 'Your follow-through',
      audience:
        user.guides.length > 0
          ? `${user.name}, plus ${user.guides.map((entry) => entry.guide.name).join(', ')}`
          : `${user.name} only`,
      visibility:
        user.guides.length > 0
          ? 'Visible according to each guide relationship and hidden-item boundary.'
          : 'Private to your own account until you add a guide.',
      items,
      relationshipCreatedAt: newestDate(user.guides.map((entry) => entry.createdAt)),
    },
    ...memberPortfolios.map((workspace) => ({
      key: `member-${workspace.member.id}`,
      subjectName: workspace.member.name,
      titlePrefix: `${workspace.member.name} relationship review`,
      audience: `${workspace.member.name} and ${user.name}`,
      visibility: `Guide-visible data only. ${workspace.relationship.historyWindow}.`,
      items: workspace.items,
      relationshipCreatedAt: workspace.relationship.createdAt,
    })),
  ];

  const windows = buildWindows(now);

  return contexts
    .flatMap((context) =>
      windows.flatMap((window, index) => {
        const summary = buildAccountabilitySummary(context.items, new Date(window.end));
        const content = summarizeContent(context, window.start, window.end);
        if (content.length === 0) return [];

        return [
          {
            id: `${context.key}-${window.end}`,
            periodStart: new Date(window.start).toISOString(),
            periodEnd: new Date(window.end).toISOString(),
            title: `${context.titlePrefix} · ${formatPeriod(window.start, window.end)}`,
            audience: context.audience,
            subjectName: context.subjectName,
            summary: buildSummaryText(context.subjectName, summary, index),
            accountabilityLabel: summary.label,
            accountabilityScore: summary.score,
            trendLabel: summary.trendLabel,
            trendDelta: summary.trendDelta,
            visibility: context.visibility,
            highlights: content.slice(0, 3),
          },
        ];
      }),
    )
    .sort((left, right) => right.periodEnd.localeCompare(left.periodEnd));
}

function buildWindows(now: Date) {
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  return Array.from({ length: WINDOW_COUNT }, (_, index) => {
    const end = endOfToday.getTime() - index * 7 * DAY_MS;
    const start = end - 7 * DAY_MS;
    return { start, end };
  });
}

function summarizeContent(context: RetrospectiveContext, start: number, end: number) {
  const highlights: string[] = [];
  const completions = context.items
    .flatMap((item) =>
      (item.completions ?? [])
        .filter((completion) => {
          const occurredAt = new Date(completion.occurredAt).getTime();
          return occurredAt >= start && occurredAt < end;
        })
        .map((completion) => ({ itemTitle: item.title, completion })),
    )
    .sort((left, right) => right.completion.occurredAt.localeCompare(left.completion.occurredAt));

  if (completions.length > 0) {
    const latest = completions[0]!;
    highlights.push(
      `${completions.length} completion${completions.length === 1 ? '' : 's'} were recorded. Latest: ${latest.itemTitle}.`,
    );
    if (latest.completion.note?.trim()) {
      highlights.push(`Latest note: ${latest.completion.note.trim()}`);
    }
  }

  const createdItems = context.items.filter((item) => {
    const createdAt = item.createdAt ? new Date(item.createdAt).getTime() : Number.NaN;
    return !Number.isNaN(createdAt) && createdAt >= start && createdAt < end;
  });
  if (createdItems.length > 0) {
    highlights.push(
      `${createdItems.length} routine${createdItems.length === 1 ? '' : 's'} entered this reflection window.`,
    );
  }

  if (context.relationshipCreatedAt) {
    const relationshipCreatedAt = new Date(context.relationshipCreatedAt).getTime();
    if (!Number.isNaN(relationshipCreatedAt) && relationshipCreatedAt >= start && relationshipCreatedAt < end) {
      highlights.push('Relationship visibility changed enough to matter for reflection history.');
    }
  }

  return highlights;
}

function buildSummaryText(subjectName: string, summary: ReturnType<typeof buildAccountabilitySummary>, index: number) {
  const periodPrefix = index === 0 ? 'Most recent 7-day reflection.' : '7-day reflection.';
  if (summary.score === null) {
    return `${periodPrefix} ${subjectName} is ${summary.label.toLowerCase()} with visibility building from shared activity.`;
  }
  return `${periodPrefix} ${subjectName} is ${summary.label.toLowerCase()} at ${summary.score}% accountability.`;
}

function formatPeriod(start: number, end: number) {
  const startLabel = new Date(start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const endLabel = new Date(end - 1).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${startLabel} to ${endLabel}`;
}

function newestDate(values: Array<string | undefined>) {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => right.localeCompare(left))[0];
}
