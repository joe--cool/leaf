import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const userRolesMock = vi.fn();
const enabledProvidersMock = vi.fn();
const sendEmailMock = vi.fn();
const inviteCreateMock = vi.fn();

vi.mock('../src/auth.js', () => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
  userRoles: userRolesMock,
  issueAuthTokens: vi.fn(),
  rotateRefreshToken: vi.fn(),
  revokeRefreshToken: vi.fn(),
}));

vi.mock('../src/oauth.js', () => ({
  buildAuthorizationUrl: vi.fn(),
  completeOAuth: vi.fn(),
  enabledProviders: enabledProvidersMock,
}));

vi.mock('../src/email.js', () => ({
  sendEmail: sendEmailMock,
}));

vi.mock('../src/prisma.js', () => ({
  prisma: {
    user: {
      count: vi.fn().mockResolvedValue(1),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    invite: {
      create: inviteCreateMock,
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    reviewerRelation: {
      create: vi.fn(),
      upsert: vi.fn(),
    },
    userRole: {
      upsert: vi.fn(),
    },
    trackingItem: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    trackingCompletion: {
      create: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe('auth/reviewer routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inviteCreateMock.mockResolvedValue({ id: 'inv_1', token: 'tok' });
  });

  it('returns enabled oauth providers', async () => {
    enabledProvidersMock.mockReturnValue(['google']);
    const { registerRoutes } = await import('../src/routes.js');

    const app = Fastify();
    app.decorate(
      'authenticate',
      async (request: { user?: { id: string; email: string; roles: string[] } }) => {
        request.user = { id: 'u1', email: 'u1@example.com', roles: ['USER'] };
      },
    );
    await app.register(registerRoutes);

    const res = await app.inject({ method: 'GET', url: '/auth/oauth/options' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ providers: ['google'] });
    await app.close();
  });

  it('blocks non-admin from inviting reviewers for other users', async () => {
    userRolesMock.mockResolvedValue(['USER']);
    const { registerRoutes } = await import('../src/routes.js');

    const app = Fastify();
    await app.register(sensible);
    app.decorate('authenticate', async (request: { user?: { id: string; email: string; roles: string[] } }) => {
      request.user = { id: 'u1', email: 'u1@example.com', roles: ['USER'] };
    });
    await app.register(registerRoutes);

    const res = await app.inject({
      method: 'POST',
      url: '/reviewers/invite',
      payload: { email: 'rev@example.com', targetUserId: 'u2' },
    });

    expect(res.statusCode).toBe(403);
    expect(sendEmailMock).not.toHaveBeenCalled();
    await app.close();
  });
});
