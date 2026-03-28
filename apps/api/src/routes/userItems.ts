import type { FastifyInstance } from 'fastify';
import { trackingItemCreateSchema } from '@leaf/shared';
import { prisma } from '../prisma.js';
import { authUser, normalizeRelationship, scheduleKindForStorage } from './shared.js';
import { completeSchema, idParamSchema, occurrenceActionSchema, preferencesSchema } from './schemas.js';

function serializeItem<T extends { actions: Array<{ kind: string }> }>(item: T) {
  return {
    ...item,
    actions: item.actions.map((action) => ({
      ...action,
      kind: action.kind.toLowerCase(),
    })),
  };
}

export async function registerUserItemRoutes(app: FastifyInstance): Promise<void> {
  app.get('/me', { preHandler: [app.authenticate] }, async (request) => {
    const actor = authUser(request);
    const user = await prisma.user.findUnique({
      where: { id: actor.id },
      include: {
        roles: true,
        reviewTargets: { include: { reviewee: true } },
        reviewers: { include: { reviewer: true } },
      },
    });

    if (!user) return null;

    return {
      ...user,
      members: user.reviewTargets.map((relation) => ({
        ...normalizeRelationship(relation),
        createdAt: relation.createdAt,
        member: relation.reviewee,
      })),
      guides: user.reviewers.map((relation) => ({
        ...normalizeRelationship(relation),
        createdAt: relation.createdAt,
        guide: relation.reviewer,
      })),
    };
  });

  app.get('/members', { preHandler: [app.authenticate] }, async (request) => {
    const actor = authUser(request);
    const user = await prisma.user.findUnique({
      where: { id: actor.id },
      include: {
        reviewTargets: {
          include: {
            reviewee: {
              include: {
                items: {
                  include: {
                    completions: {
                      orderBy: { occurredAt: 'desc' },
                      take: 5,
                    },
                    actions: {
                      orderBy: { occurredAt: 'desc' },
                      take: 10,
                    },
                  },
                  orderBy: { createdAt: 'desc' },
                },
              },
            },
          },
        },
      },
    });

    return (
      user?.reviewTargets.map((relation) => ({
        member: relation.reviewee,
        relationship: {
          ...normalizeRelationship(relation),
          createdAt: relation.createdAt,
        },
        items: relation.reviewee.items.map(serializeItem),
      })) ?? []
    );
  });

  app.post('/items', { preHandler: [app.authenticate] }, async (request) => {
    const actor = authUser(request);
    const body = trackingItemCreateSchema.parse(request.body);
    return prisma.trackingItem.create({
      data: {
        ownerId: actor.id,
        title: body.title,
        description: body.description,
        category: body.category,
        scheduleKind: scheduleKindForStorage(body.schedule) as
          | 'ONE_TIME'
          | 'DAILY'
          | 'WEEKLY'
          | 'INTERVAL_DAYS'
          | 'CUSTOM_DATES',
        scheduleData: body.schedule,
        notificationEnabled: body.notificationEnabled,
        notificationHardToDismiss: body.notificationHardToDismiss,
        notificationRepeatMinutes: body.notificationRepeatMinutes,
      },
    });
  });

  app.get('/items', { preHandler: [app.authenticate] }, async (request) => {
    const actor = authUser(request);
    const items = await prisma.trackingItem.findMany({
      where: { ownerId: actor.id },
      include: {
        completions: {
          orderBy: { occurredAt: 'desc' },
          take: 10,
        },
        actions: {
          orderBy: { occurredAt: 'desc' },
          take: 20,
        },
      },
    });
    return items.map(serializeItem);
  });

  app.put('/items/:id', { preHandler: [app.authenticate] }, async (request) => {
    const actor = authUser(request);
    const params = idParamSchema.parse(request.params);
    const body = trackingItemCreateSchema.parse(request.body);
    const item = await prisma.trackingItem.findUnique({ where: { id: params.id } });
    if (!item || item.ownerId !== actor.id) {
      throw app.httpErrors.notFound('Item not found');
    }

    return prisma.trackingItem.update({
      where: { id: params.id },
      data: {
        title: body.title,
        description: body.description,
        category: body.category,
        scheduleKind: scheduleKindForStorage(body.schedule) as
          | 'ONE_TIME'
          | 'DAILY'
          | 'WEEKLY'
          | 'INTERVAL_DAYS'
          | 'CUSTOM_DATES',
        scheduleData: body.schedule,
        notificationEnabled: body.notificationEnabled,
        notificationHardToDismiss: body.notificationHardToDismiss,
        notificationRepeatMinutes: body.notificationRepeatMinutes,
      },
    });
  });

  app.post('/items/:id/complete', { preHandler: [app.authenticate] }, async (request) => {
    const actor = authUser(request);
    const params = idParamSchema.parse(request.params);
    const body = completeSchema.parse(request.body ?? {});
    const item = await prisma.trackingItem.findUnique({ where: { id: params.id } });
    if (!item || item.ownerId !== actor.id) {
      throw app.httpErrors.notFound('Item not found');
    }
    return prisma.trackingCompletion.create({
      data: {
        itemId: params.id,
        userId: actor.id,
        occurredAt: body.occurredAt ? new Date(body.occurredAt) : new Date(),
        targetAt: body.targetAt ? new Date(body.targetAt) : undefined,
        note: body.note,
      },
    });
  });

  app.post('/items/:id/actions', { preHandler: [app.authenticate] }, async (request) => {
    const actor = authUser(request);
    const params = idParamSchema.parse(request.params);
    const body = occurrenceActionSchema.parse(request.body ?? {});
    const item = await prisma.trackingItem.findUnique({ where: { id: params.id } });
    if (!item || item.ownerId !== actor.id) {
      throw app.httpErrors.notFound('Item not found');
    }

    if (body.kind === 'complete') {
      return prisma.trackingCompletion.create({
        data: {
          itemId: params.id,
          userId: actor.id,
          occurredAt: new Date(),
          targetAt: new Date(body.targetAt),
          note: body.note,
        },
      });
    }

    return prisma.trackingItemAction.upsert({
      where: {
        itemId_userId_kind_targetAt: {
          itemId: params.id,
          userId: actor.id,
          kind: body.kind.toUpperCase(),
          targetAt: new Date(body.targetAt),
        },
      },
      create: {
        itemId: params.id,
        userId: actor.id,
        kind: body.kind.toUpperCase(),
        targetAt: new Date(body.targetAt),
        note: body.note,
      },
      update: {
        note: body.note,
        occurredAt: new Date(),
      },
    });
  });

  app.patch('/me/preferences', { preHandler: [app.authenticate] }, async (request) => {
    const actor = authUser(request);
    const body = preferencesSchema.parse(request.body ?? {});

    if (body.targetMemberId && body.targetMemberId !== actor.id) {
      const relation = await prisma.reviewerRelation.findUnique({
        where: {
          reviewerId_revieweeId: {
            reviewerId: actor.id,
            revieweeId: body.targetMemberId,
          },
        },
      });

      if (!relation?.canManageAccountability) {
        throw app.httpErrors.forbidden('You cannot update this member prompt');
      }
    }

    return prisma.user.update({
      where: { id: body.targetMemberId ?? actor.id },
      data: {
        name: body.name,
        avatarUrl: body.avatarUrl,
        weeklyDigestHour: body.weeklyDigestHour,
        weeklyDigestDay: body.weeklyDigestDay,
        reflectionCadence: body.reflectionCadence,
        reflectionWeekday: body.reflectionWeekday,
        reflectionMonthDay: body.reflectionMonthDay,
        reflectionPrompt: body.reflectionPrompt === undefined ? undefined : body.reflectionPrompt?.trim() || null,
        timezone: body.timezone,
      },
    });
  });
}
