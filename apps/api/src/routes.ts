import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { loginSchema, scheduleSchema, trackingItemCreateSchema } from '@tracker/shared';
import { z } from 'zod';
import { prisma } from './prisma.js';
import {
  hashPassword,
  issueAuthTokens,
  revokeRefreshToken,
  rotateRefreshToken,
  userRoles,
  verifyPassword,
} from './auth.js';
import { sendEmail } from './email.js';
import { buildAuthorizationUrl, completeOAuth, enabledProviders } from './oauth.js';
import { env } from './env.js';

const completeSchema = z.object({
  occurredAt: z.string().optional(),
  note: z.string().optional(),
});

const inviteSchema = z.object({
  email: z.string().email(),
  targetUserId: z.string().optional(),
});

const acceptInviteSchema = z.object({ token: z.string().min(1) });
const adminReviewerSchema = z.object({ reviewerId: z.string(), revieweeId: z.string() });
const preferencesSchema = z.object({
  weeklyDigestHour: z.number().int().min(0).max(23).optional(),
  weeklyDigestDay: z.number().int().min(0).max(6).optional(),
  timezone: z.string().optional(),
});
const bootstrapAdminSchema = z.object({ userId: z.string() });
const idParamSchema = z.object({ id: z.string() });
const oauthStartQuerySchema = z.object({
  returnTo: z.string().url().default('http://localhost:5173/oauth/callback'),
});
const oauthCallbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});
const refreshSchema = z.object({ refreshToken: z.string().min(1) });
const firstAdminSetupSchema = loginSchema.extend({
  name: z.string().min(1),
  setupToken: z.string().optional(),
});

function authUser(request: { user: unknown }): { id: string; email: string; roles: string[] } {
  return request.user as { id: string; email: string; roles: string[] };
}

function hasRole(roles: string[], target: string): boolean {
  return roles.includes(target);
}

function scheduleKindForStorage(schedule: { kind: string; schedules?: Array<{ kind: string }> }): string {
  if (schedule.kind === 'MULTI') {
    return schedule.schedules?.[0]?.kind ?? 'CUSTOM_DATES';
  }
  return schedule.kind;
}

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({ ok: true }));

  app.get('/setup/status', async () => {
    const users = await prisma.user.count();
    return { needsSetup: users === 0 };
  });

  app.post('/setup/first-admin', async (request, reply) => {
    const body = firstAdminSetupSchema.parse(request.body);
    const users = await prisma.user.count();
    if (users > 0) return reply.badRequest('Setup is complete');
    if (env.SETUP_TOKEN && body.setupToken !== env.SETUP_TOKEN) {
      return reply.forbidden('Invalid setup token');
    }

    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        passwordHash: await hashPassword(body.password),
        roles: { create: [{ role: 'ADMIN' }, { role: 'USER' }] },
      },
      include: { roles: true },
    });

    const roles = user.roles.map((entry: { role: string }) => entry.role);
    const tokens = await issueAuthTokens({
      reply,
      userId: user.id,
      email: user.email,
      roles,
    });
    return { ...tokens, userId: user.id, email: user.email, roles };
  });

  app.post('/auth/register', async (request) => {
    const body = loginSchema.extend({ name: z.string().min(1) }).parse(request.body);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        passwordHash: await hashPassword(body.password),
        roles: { create: [{ role: 'USER' }] },
      },
    });

    return { id: user.id, email: user.email };
  });

  app.post('/auth/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: { roles: true },
    });

    if (!user) return reply.unauthorized('Invalid credentials');
    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) return reply.unauthorized('Invalid credentials');

    const roles = user.roles.map((entry: { role: string }) => entry.role);
    const tokens = await issueAuthTokens({
      reply,
      userId: user.id,
      email: user.email,
      roles,
    });
    return { ...tokens, userId: user.id, email: user.email, roles };
  });

  app.post('/auth/refresh', async (request, reply) => {
    const body = refreshSchema.parse(request.body);
    try {
      return await rotateRefreshToken({ reply, refreshToken: body.refreshToken });
    } catch {
      return reply.unauthorized('Invalid refresh token');
    }
  });

  app.post('/auth/logout', async (request) => {
    const body = refreshSchema.parse(request.body);
    await revokeRefreshToken(body.refreshToken);
    return { loggedOut: true };
  });

  app.get('/auth/oauth/options', async () => {
    return { providers: enabledProviders() };
  });

  app.get('/auth/oauth/:provider/start', async (request) => {
    const params = z.object({ provider: z.enum(['google', 'apple']) }).parse(request.params);
    const query = oauthStartQuerySchema.parse(request.query);
    const url = await buildAuthorizationUrl(params.provider, query.returnTo);
    return { url };
  });

  app.get('/auth/oauth/:provider/callback', async (request, reply) => {
    const params = z.object({ provider: z.enum(['google', 'apple']) }).parse(request.params);
    const query = oauthCallbackQuerySchema.parse(request.query);
    const oauthUser = await completeOAuth({
      provider: params.provider,
      state: query.state,
      code: query.code,
    });

    let user = await prisma.user.findUnique({
      where: { email: oauthUser.email },
      include: { roles: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: oauthUser.email,
          name: oauthUser.name,
          passwordHash: await hashPassword(crypto.randomBytes(32).toString('hex')),
          roles: { create: [{ role: 'USER' }] },
        },
        include: { roles: true },
      });
    }

    const roles = user.roles.map((entry: { role: string }) => entry.role);
    const tokens = await issueAuthTokens({
      reply,
      userId: user.id,
      email: user.email,
      roles,
    });
    return reply.redirect(
      `${oauthUser.returnTo}?token=${encodeURIComponent(tokens.accessToken)}&refreshToken=${encodeURIComponent(tokens.refreshToken)}`,
    );
  });

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

  app.post('/reviewers/invite', { preHandler: [app.authenticate] }, async (request, reply) => {
    const actor = authUser(request);
    const body = inviteSchema.parse(request.body);
    const targetUserId = body.targetUserId ?? actor.id;
    const isAdmin = hasRole(await userRoles(actor.id), 'ADMIN');
    if (targetUserId !== actor.id && !isAdmin) {
      return reply.forbidden('Only admins can invite reviewer for others');
    }

    const token = crypto.randomBytes(24).toString('hex');
    const invite = await prisma.invite.create({
      data: {
        inviterId: actor.id,
        inviteeMail: body.email,
        type: 'REVIEWER',
        token,
        targetUserId,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
    });

    await sendEmail({
      to: [body.email],
      subject: 'Tracker reviewer invite',
      text: `Use invite token: ${invite.token}`,
    });

    return { inviteId: invite.id, token: invite.token };
  });

  app.post('/reviewers/accept', { preHandler: [app.authenticate] }, async (request) => {
    const actor = authUser(request);
    const body = acceptInviteSchema.parse(request.body);
    const invite = await prisma.invite.findUnique({ where: { token: body.token } });
    if (!invite || invite.type !== 'REVIEWER' || invite.acceptedAt || invite.expiresAt < new Date()) {
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

  app.post('/admin/reviewers', { preHandler: [app.authenticate] }, async (request, reply) => {
    const actor = authUser(request);
    const roles = await userRoles(actor.id);
    if (!hasRole(roles, 'ADMIN')) {
      return reply.forbidden('Admin required');
    }

    const body = adminReviewerSchema.parse(request.body);
    return prisma.reviewerRelation.upsert({
      where: { reviewerId_revieweeId: { reviewerId: body.reviewerId, revieweeId: body.revieweeId } },
      create: {
        reviewerId: body.reviewerId,
        revieweeId: body.revieweeId,
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

  app.patch('/me/preferences', { preHandler: [app.authenticate] }, async (request) => {
    const actor = authUser(request);
    const body = preferencesSchema.parse(request.body ?? {});

    return prisma.user.update({
      where: { id: actor.id },
      data: {
        weeklyDigestHour: body.weeklyDigestHour,
        weeklyDigestDay: body.weeklyDigestDay,
        timezone: body.timezone,
      },
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

  app.post('/validate/schedule', async (request) => {
    const body = z.object({ schedule: z.unknown() }).parse(request.body);
    return scheduleSchema.parse(body.schedule);
  });
}
