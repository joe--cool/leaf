import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { ProposedRelationship } from '@leaf/shared';
import { prisma } from '../prisma.js';
import { sendEmail } from '../email.js';
import { userRoles } from '../auth.js';
import { authUser, hasRole, relationshipDefaults, relationshipTemplate } from './shared.js';
import {
  acceptInviteSchema,
  adminGuideSchema,
  bootstrapAdminSchema,
  inviteSchema,
} from './schemas.js';
import { env } from '../env.js';

function invitedRelationshipFromRecord(invite: {
  relationshipTemplateId?: string | null;
  relationshipMode?: string | null;
  canActOnItems?: boolean | null;
  canManageRoutines?: boolean | null;
  canManageAccountability?: boolean | null;
  historyWindow?: string | null;
}): ProposedRelationship {
  const defaults = relationshipDefaults();
  return {
    templateId:
      invite.relationshipTemplateId === 'active-guide' ||
      invite.relationshipTemplateId === 'passive-guide' ||
      invite.relationshipTemplateId === 'parent' ||
      invite.relationshipTemplateId === 'accountability-partner'
        ? invite.relationshipTemplateId
        : 'passive-guide',
    mode: invite.relationshipMode === 'active' ? 'active' : defaults.mode,
    canActOnItems: invite.canActOnItems ?? defaults.canActOnItems,
    canManageRoutines: invite.canManageRoutines ?? defaults.canManageRoutines,
    canManageFollowThrough: invite.canManageAccountability ?? defaults.canManageFollowThrough,
    historyWindow: invite.historyWindow ?? defaults.historyWindow,
  };
}

export async function registerGuideAdminRoutes(app: FastifyInstance): Promise<void> {
  app.post('/guides/invite', { preHandler: [app.authenticate] }, async (request, reply) => {
    const actor = authUser(request);
    const body = inviteSchema.parse(request.body);
    const targetMemberId = body.targetMemberId ?? actor.id;
    const isAdmin = hasRole(await userRoles(actor.id), 'ADMIN');
    if (targetMemberId !== actor.id && !isAdmin) {
      return reply.forbidden('Only admins can invite guides for others');
    }
    const proposedRelationship = relationshipTemplate(body.relationshipTemplateId);

    const token = crypto.randomBytes(24).toString('hex');
    const invite = await prisma.invite.create({
      data: {
        inviterId: actor.id,
        inviteeMail: body.email,
        type: 'GUIDE',
        token,
        targetUserId: targetMemberId,
        relationshipTemplateId: proposedRelationship.templateId,
        relationshipMode: proposedRelationship.mode,
        canActOnItems: proposedRelationship.canActOnItems,
        canManageRoutines: proposedRelationship.canManageRoutines,
        canManageAccountability: proposedRelationship.canManageFollowThrough,
        historyWindow: proposedRelationship.historyWindow,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
    });
    const invitationUrl = `${env.CORS_ORIGIN.replace(/\/$/, '')}/join/${invite.token}`;

    await sendEmail({
      to: [body.email],
      subject: 'leaf guide invite',
      text: `Open your invite: ${invitationUrl}`,
    });

    return { inviteId: invite.id, token: invite.token, invitationUrl };
  });

  app.get('/invites/:token', async (request) => {
    const params = acceptInviteSchema.parse(request.params);
    const invite = await prisma.invite.findUnique({
      where: { token: params.token },
      include: {
        inviter: { select: { id: true, name: true, email: true } },
      },
    });

    if (!invite || invite.type !== 'GUIDE' || invite.acceptedAt || invite.expiresAt < new Date()) {
      throw app.httpErrors.notFound('Invite not found');
    }

    const targetUser = invite.targetUserId
      ? await prisma.user.findUnique({
          where: { id: invite.targetUserId },
          select: { id: true, name: true, email: true },
        })
      : null;

    return {
      token: invite.token,
      inviteeEmail: invite.inviteeMail,
      expiresAt: invite.expiresAt.toISOString(),
      inviter: invite.inviter,
      member: targetUser,
      proposedRelationship: invitedRelationshipFromRecord(invite),
    };
  });

  app.post('/guides/accept', { preHandler: [app.authenticate] }, async (request) => {
    const actor = authUser(request);
    const body = acceptInviteSchema.parse(request.body);
    const invite = await prisma.invite.findUnique({ where: { token: body.token } });
    if (!invite || invite.type !== 'GUIDE' || invite.acceptedAt || invite.expiresAt < new Date()) {
      throw app.httpErrors.badRequest('Invalid invite');
    }
    if (invite.inviteeMail.toLowerCase() !== actor.email.toLowerCase()) {
      throw app.httpErrors.forbidden('This invite does not belong to the current account');
    }
    const proposedRelationship = invitedRelationshipFromRecord(invite);

    await prisma.$transaction([
      prisma.reviewerRelation.upsert({
        where: {
          reviewerId_revieweeId: {
            reviewerId: actor.id,
            revieweeId: invite.targetUserId!,
          },
        },
        create: {
          reviewerId: actor.id,
          revieweeId: invite.targetUserId!,
          mode: proposedRelationship.mode,
          canActOnItems: proposedRelationship.canActOnItems,
          canManageRoutines: proposedRelationship.canManageRoutines,
          canManageAccountability: proposedRelationship.canManageFollowThrough,
          historyWindow: proposedRelationship.historyWindow,
        },
        update: {
          mode: proposedRelationship.mode,
          canActOnItems: proposedRelationship.canActOnItems,
          canManageRoutines: proposedRelationship.canManageRoutines,
          canManageAccountability: proposedRelationship.canManageFollowThrough,
          historyWindow: proposedRelationship.historyWindow,
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

    return { accepted: true, proposedRelationship };
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
