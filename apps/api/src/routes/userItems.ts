import type { FastifyInstance } from 'fastify';
import { trackingItemCreateSchema } from '@leaf/shared';
import { prisma } from '../prisma.js';
import { authUser, normalizeRelationship, scheduleKindForStorage } from './shared.js';
import { completeSchema, idParamSchema, preferencesSchema } from './schemas.js';

export async function registerUserItemRoutes(app: FastifyInstance): Promise<void> {
  app.get('/me', { preHandler: [app.authenticate] }, async (request) => {
    const actor = authUser(request);
    return prisma.user.findUnique({
      where: { id: actor.id },
      include: {
        roles: true,
        reviewTargets: { include: { reviewee: true } },
        reviewers: { include: { reviewer: true } },
      },
    });
  });

  app.get('/reviewees', { preHandler: [app.authenticate] }, async (request) => {
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
        reviewee: relation.reviewee,
        relationship: normalizeRelationship(relation),
        items: relation.reviewee.items,
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
    return prisma.trackingItem.findMany({ where: { ownerId: actor.id } });
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
        note: body.note,
      },
    });
  });

  app.patch('/me/preferences', { preHandler: [app.authenticate] }, async (request) => {
    const actor = authUser(request);
    const body = preferencesSchema.parse(request.body ?? {});

    return prisma.user.update({
      where: { id: actor.id },
      data: {
        name: body.name,
        avatarUrl: body.avatarUrl,
        weeklyDigestHour: body.weeklyDigestHour,
        weeklyDigestDay: body.weeklyDigestDay,
        timezone: body.timezone,
      },
    });
  });
}
