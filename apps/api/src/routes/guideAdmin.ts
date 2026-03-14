import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../prisma.js';
import { sendEmail } from '../email.js';
import { userRoles } from '../auth.js';
import { authUser, hasRole } from './shared.js';
import {
  acceptInviteSchema,
  adminGuideSchema,
  bootstrapAdminSchema,
  inviteSchema,
} from './schemas.js';

export async function registerGuideAdminRoutes(app: FastifyInstance): Promise<void> {
  app.post('/guides/invite', { preHandler: [app.authenticate] }, async (request, reply) => {
    const actor = authUser(request);
    const body = inviteSchema.parse(request.body);
    const targetMemberId = body.targetMemberId ?? actor.id;
    const isAdmin = hasRole(await userRoles(actor.id), 'ADMIN');
    if (targetMemberId !== actor.id && !isAdmin) {
      return reply.forbidden('Only admins can invite guides for others');
    }

    const token = crypto.randomBytes(24).toString('hex');
    const invite = await prisma.invite.create({
      data: {
        inviterId: actor.id,
        inviteeMail: body.email,
        type: 'GUIDE',
        token,
        targetUserId: targetMemberId,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
    });

    await sendEmail({
      to: [body.email],
      subject: 'leaf guide invite',
      text: `Use invite token: ${invite.token}`,
    });

    return { inviteId: invite.id, token: invite.token };
  });

  app.post('/guides/accept', { preHandler: [app.authenticate] }, async (request) => {
    const actor = authUser(request);
    const body = acceptInviteSchema.parse(request.body);
    const invite = await prisma.invite.findUnique({ where: { token: body.token } });
    if (!invite || invite.type !== 'GUIDE' || invite.acceptedAt || invite.expiresAt < new Date()) {
      throw app.httpErrors.badRequest('Invalid invite');
    }

    await prisma.$transaction([
      prisma.reviewerRelation.create({
        data: {
          reviewerId: actor.id,
          revieweeId: invite.targetUserId!,
        },
      }),
      prisma.invite.update({
        where: { id: invite.id },
        data: {
          inviteeId: actor.id,
          acceptedAt: new Date(),
        },
      }),
    ]);

    return { accepted: true };
  });

  app.post('/admin/guides', { preHandler: [app.authenticate] }, async (request, reply) => {
    const actor = authUser(request);
    const roles = await userRoles(actor.id);
    if (!hasRole(roles, 'ADMIN')) {
      return reply.forbidden('Admin required');
    }

    const body = adminGuideSchema.parse(request.body);
    return prisma.reviewerRelation.upsert({
      where: { reviewerId_revieweeId: { reviewerId: body.guideId, revieweeId: body.memberId } },
      create: {
        reviewerId: body.guideId,
        revieweeId: body.memberId,
        mode: 'passive',
        canActOnItems: false,
        canManageRoutines: false,
        canManageAccountability: false,
        historyWindow: 'Future only',
        hiddenItemCount: 0,
      },
      update: {},
    });
  });

  app.get('/admin/users', { preHandler: [app.authenticate] }, async (request, reply) => {
    const actor = authUser(request);
    const roles = await userRoles(actor.id);
    if (!hasRole(roles, 'ADMIN')) {
      return reply.forbidden('Admin required');
    }

    return prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        roles: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  });

  app.post('/auth/bootstrap-admin', { preHandler: [app.authenticate] }, async (request, reply) => {
    const actor = authUser(request);
    const roles = await userRoles(actor.id);
    if (!hasRole(roles, 'ADMIN')) return reply.forbidden('Admin required');
    const body = bootstrapAdminSchema.parse(request.body);
    await prisma.userRole.upsert({
      where: {
        userId_role: { userId: body.userId, role: 'ADMIN' },
      },
      create: {
        userId: body.userId,
        role: 'ADMIN',
      },
      update: {},
    });
    return { promoted: true };
  });
}
