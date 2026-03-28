import type { Prisma } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import {
  defaultReflectionWritingPrompt,
  relationshipHistoryWindowLabel,
  retrospectiveContributionSchema,
  retrospectiveCreateSchema,
  retrospectiveUpdateSchema,
  type RelationshipHistoryWindow,
  type RetrospectivePromptPreset,
} from '@leaf/shared';
import { prisma } from '../prisma.js';
import { authUser } from './shared.js';
import { idParamSchema } from './schemas.js';

const retrospectiveInclude = {
  subjectUser: true,
  createdBy: true,
  relation: {
    include: {
      reviewer: true,
      reviewee: true,
    },
  },
  contributions: {
    include: {
      author: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.RetrospectiveInclude;

type RetrospectiveRecord = Prisma.RetrospectiveGetPayload<{ include: typeof retrospectiveInclude }>;

export async function registerRetrospectiveRoutes(app: FastifyInstance): Promise<void> {
  app.get('/retrospectives', { preHandler: [app.authenticate] }, async (request) => {
    const actor = authUser(request);
    return loadVisibleRetrospectives(actor.id);
  });

  app.post('/retrospectives', { preHandler: [app.authenticate] }, async (request) => {
    const actor = authUser(request);
    const body = retrospectiveCreateSchema.parse(request.body ?? {});
    const subjectUserId = body.subjectUserId ?? actor.id;
    const periodStart = new Date(body.periodStart);
    const periodEnd = new Date(body.periodEnd);

    if (periodEnd <= periodStart) {
      throw app.httpErrors.badRequest('Retrospective periods must end after they start');
    }

    const created = await prisma.$transaction(async (tx) => {
      const subject = await tx.user.findUnique({
        where: { id: subjectUserId },
        include: {
          reviewers: {
            include: {
              reviewer: true,
            },
          },
        },
      });

      if (!subject) {
        throw app.httpErrors.notFound('Subject not found');
      }

      const relation =
        subjectUserId === actor.id
          ? null
          : await tx.reviewerRelation.findUnique({
              where: {
                reviewerId_revieweeId: {
                  reviewerId: actor.id,
                  revieweeId: subjectUserId,
                },
              },
              include: {
                reviewer: true,
                reviewee: true,
              },
            });

      if (subjectUserId !== actor.id && (!relation || !relation.canManageAccountability)) {
        throw app.httpErrors.forbidden('You cannot create reflections for this member');
      }

      const prompts = promptsForPreset(body.promptPreset, subject.name, Boolean(relation));
      const title = body.title?.trim() || defaultTitle(body.kind, subject.name, periodStart, periodEnd, Boolean(relation));
      const audienceSummary = relation
        ? `${relation.reviewee.name} and ${relation.reviewer.name}`
        : subject.reviewers.length > 0
          ? `${subject.name}, plus permitted guides`
          : `${subject.name} only`;
      const visibilitySummary = relation
        ? `Visible while ${relation.reviewer.name}'s relationship window includes ${subject.name}'s reflection period (${relationshipHistoryWindowLabel(relation.historyWindow as RelationshipHistoryWindow)}).`
        : subject.reviewers.length > 0
          ? 'Visible to you and any current guide whose relationship history window includes this reflection period.'
          : 'Private to your own account until you add a guide.';

      const retrospective = await tx.retrospective.create({
        data: {
          subjectUserId: subject.id,
          relationId: relation?.id,
          createdById: actor.id,
          kind: body.kind,
          title,
          summaryText: body.summary?.trim() || null,
          promptPreset: body.promptPreset,
          prompts,
          audienceSummary,
          visibilitySummary,
          periodStart,
          periodEnd,
        },
      });

      return retrospective.id;
    });

    return loadRetrospectiveForActorOrThrow(app, actor.id, created);
  });

  app.patch('/retrospectives/:id', { preHandler: [app.authenticate] }, async (request) => {
    const actor = authUser(request);
    const params = idParamSchema.parse(request.params);
    const body = retrospectiveUpdateSchema.parse(request.body ?? {});
    const retrospective = await loadRetrospectiveRecordForActorOrThrow(app, actor.id, params.id);

    const canEditSummary =
      retrospective.subjectUserId === actor.id ||
      (retrospective.relation?.reviewerId === actor.id && retrospective.relation.canManageAccountability);

    if (!canEditSummary) {
      throw app.httpErrors.forbidden('You cannot edit this reflection summary');
    }

    await prisma.retrospective.update({
      where: { id: params.id },
      data: {
        summaryText: body.summary.trim(),
      },
    });

    return loadRetrospectiveForActorOrThrow(app, actor.id, params.id);
  });

  app.post('/retrospectives/:id/contributions', { preHandler: [app.authenticate] }, async (request) => {
    const actor = authUser(request);
    const params = idParamSchema.parse(request.params);
    const body = retrospectiveContributionSchema.parse(request.body ?? {});
    const retrospective = await loadRetrospectiveForActorOrThrow(app, actor.id, params.id);

    if (!retrospective.canContribute) {
      throw app.httpErrors.forbidden('You cannot contribute to this reflection');
    }

    await prisma.retrospectiveContribution.create({
      data: {
        retrospectiveId: params.id,
        authorId: actor.id,
        body: body.body.trim(),
      },
    });

    return loadRetrospectiveForActorOrThrow(app, actor.id, params.id);
  });
}

async function loadVisibleRetrospectives(actorId: string) {
  const retrospectives = await prisma.retrospective.findMany({
    where: {
      OR: [{ subjectUserId: actorId }, { relation: { is: { reviewerId: actorId } } }],
    },
    include: retrospectiveInclude,
    orderBy: [{ periodEnd: 'desc' }, { createdAt: 'desc' }],
  });

  return retrospectives.filter((entry) => canViewRetrospective(entry, actorId)).map((entry) => serializeRetrospective(entry, actorId));
}

async function loadRetrospectiveForActorOrThrow(app: FastifyInstance, actorId: string, retrospectiveId: string) {
  const retrospective = await loadRetrospectiveRecordForActorOrThrow(app, actorId, retrospectiveId);
  return serializeRetrospective(retrospective, actorId);
}

async function loadRetrospectiveRecordForActorOrThrow(app: FastifyInstance, actorId: string, retrospectiveId: string) {
  const retrospective = await prisma.retrospective.findUnique({
    where: { id: retrospectiveId },
    include: retrospectiveInclude,
  });

  if (!retrospective || !canViewRetrospective(retrospective, actorId)) {
    throw app.httpErrors.notFound('Retrospective not found');
  }

  return retrospective;
}

function serializeRetrospective(retrospective: RetrospectiveRecord, actorId: string) {
  const prompts = Array.isArray(retrospective.prompts) ? retrospective.prompts.filter(isString) : [];
  const viewerRole =
    retrospective.subjectUserId === actorId ? 'member' : retrospective.relation?.reviewerId === actorId ? 'guide' : 'observer';

  return {
    id: retrospective.id,
    subjectUserId: retrospective.subjectUserId,
    kind: retrospective.kind === 'manual' ? 'manual' : 'scheduled',
    title: retrospective.title,
    subjectName: retrospective.subjectUser.name,
    periodStart: retrospective.periodStart.toISOString(),
    periodEnd: retrospective.periodEnd.toISOString(),
    audience: retrospective.audienceSummary,
    visibility: retrospective.visibilitySummary,
    createdAt: retrospective.createdAt.toISOString(),
    createdByName: retrospective.createdBy.name,
    summary: retrospective.summaryText,
    promptPreset: retrospective.promptPreset,
    prompts,
    writingPrompt: retrospective.subjectUser.reflectionPrompt?.trim() || defaultReflectionWritingPrompt,
    viewerRole,
    canContribute:
      retrospective.subjectUserId === actorId ||
      (retrospective.relation?.reviewerId === actorId && retrospective.relation.canManageAccountability),
    contributions: retrospective.contributions.map((contribution) => ({
      id: contribution.id,
      body: contribution.body,
      createdAt: contribution.createdAt.toISOString(),
      authorName: contribution.author.name,
      authorRole:
        contribution.authorId === retrospective.subjectUserId
          ? 'member'
          : contribution.authorId === retrospective.relation?.reviewerId
            ? 'guide'
            : 'participant',
    })),
  };
}

function canViewRetrospective(retrospective: RetrospectiveRecord, actorId: string) {
  if (retrospective.subjectUserId === actorId) return true;
  if (retrospective.relation?.reviewerId !== actorId) return false;
  return relationWindowAllows(retrospective.relation.historyWindow, retrospective.relation.createdAt, retrospective.periodEnd);
}

function relationWindowAllows(historyWindow: string, relationCreatedAt: Date, periodEnd: Date, now = new Date()) {
  const effectiveStart = relationCreatedAt.getTime();
  const retrospectiveEnd = periodEnd.getTime();

  if (historyWindow === 'future-only' || historyWindow === 'since-relationship-start') {
    return retrospectiveEnd >= effectiveStart;
  }

  if (historyWindow === 'full-history') {
    return true;
  }

  const lookbackDays = historyWindow === 'last-30-days-and-upcoming' ? 30 : 0;
  if (lookbackDays === 0) {
    return retrospectiveEnd >= effectiveStart;
  }

  const cutoff = now.getTime() - lookbackDays * 24 * 60 * 60 * 1000;
  return retrospectiveEnd >= cutoff;
}

function promptsForPreset(preset: RetrospectivePromptPreset, subjectName: string, isRelationshipReview: boolean) {
  if (preset === 'support-check-in') {
    return isRelationshipReview
      ? [
          `What support helped ${subjectName} most in this window?`,
          `Where did follow-through still slip, and what should change next?`,
          'Which accountability signals should both sides keep watching?',
        ]
      : [
          'What support or structure helped most in this window?',
          'Where did follow-through still slip?',
          'What should change before the next review?',
        ];
  }

  if (preset === 'reset-and-obstacles') {
    return [
      `What blocked ${subjectName} most often in this window?`,
      'Which reset is realistic for the next few days?',
      'What boundary, reminder, or support change would help most?',
    ];
  }

  return [
    `What went well for ${subjectName} in this window?`,
    'What felt harder than expected?',
    'What is the clearest adjustment before the next review?',
  ];
}

function defaultTitle(kind: 'manual' | 'scheduled', subjectName: string, periodStart: Date, periodEnd: Date, isRelationshipReview: boolean) {
  const prefix = kind === 'manual' ? 'Impromptu Reflection' : isRelationshipReview ? 'Scheduled reflection' : 'Weekly reflection';
  return `${prefix} · ${subjectName} · ${formatPeriod(periodStart, periodEnd)}`;
}

function formatPeriod(periodStart: Date, periodEnd: Date) {
  const start = periodStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const end = new Date(periodEnd.getTime() - 1).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${start} to ${end}`;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}
