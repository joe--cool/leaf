import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { loginSchema } from '@leaf/shared';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import {
  hashPassword,
  issueAuthTokens,
  revokeRefreshToken,
  rotateRefreshToken,
  verifyPassword,
} from '../auth.js';
import { buildAuthorizationUrl, completeOAuth, enabledProviders } from '../oauth.js';
import { env } from '../env.js';
import {
  firstAdminSetupSchema,
  inviteRegistrationSchema,
  oauthCallbackQuerySchema,
  oauthStartQuerySchema,
  refreshSchema,
} from './schemas.js';
import { seedDemoWorkspace } from '../demoSeed.js';

export async function registerSetupAuthRoutes(app: FastifyInstance): Promise<void> {
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

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        passwordHash,
        roles: { create: [{ role: 'ADMIN' }, { role: 'USER' }] },
      },
      include: { roles: true },
    });

    if (body.demoMode) {
      await seedDemoWorkspace({
        id: user.id,
        email: user.email,
        name: user.name,
      }, passwordHash);
    }

    const roles = user.roles.map((entry: { role: string }) => entry.role);
    const tokens = await issueAuthTokens({
      reply,
      userId: user.id,
      email: user.email,
      roles,
    });
    return { ...tokens, userId: user.id, email: user.email, roles };
  });

  app.post('/auth/register', async (request, reply) => {
    const body = inviteRegistrationSchema.or(loginSchema.extend({ name: z.string().min(1) })).parse(request.body);

    if ('token' in body) {
      const invite = await prisma.invite.findUnique({ where: { token: body.token } });
      if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
        throw app.httpErrors.badRequest('Invalid invite');
      }
      if (invite.inviteeMail.toLowerCase() !== body.email.toLowerCase()) {
        throw app.httpErrors.badRequest('Invite email does not match this account');
      }
    }

    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        passwordHash: await hashPassword(body.password),
        roles: { create: [{ role: 'USER' }] },
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

  app.get('/auth/oauth/options', async () => ({ providers: enabledProviders() }));

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
}
