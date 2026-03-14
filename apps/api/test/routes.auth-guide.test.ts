import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const userRolesMock = vi.fn();
const enabledProvidersMock = vi.fn();
const sendEmailMock = vi.fn();
const inviteCreateMock = vi.fn();
const userFindUniqueMock = vi.fn();
const seedDemoWorkspaceMock = vi.fn();
const userCreateMock = vi.fn();
const issueAuthTokensMock = vi.fn();
const hashPasswordMock = vi.fn();

vi.mock('../src/auth.js', () => ({
  hashPassword: hashPasswordMock,
  verifyPassword: vi.fn(),
  userRoles: userRolesMock,
  issueAuthTokens: issueAuthTokensMock,
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

vi.mock('../src/demoSeed.js', () => ({
  seedDemoWorkspace: seedDemoWorkspaceMock,
}));

vi.mock('../src/prisma.js', () => ({
  prisma: {
    user: {
      count: vi.fn().mockResolvedValue(1),
      findUnique: userFindUniqueMock,
      findMany: vi.fn(),
      create: userCreateMock,
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

describe('auth/guide routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inviteCreateMock.mockResolvedValue({ id: 'inv_1', token: 'tok' });
    hashPasswordMock.mockResolvedValue('hashed-password');
    issueAuthTokensMock.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
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

  it('seeds demo workspace when first admin setup enables demo mode', async () => {
    const { prisma } = await import('../src/prisma.js');
    const { registerRoutes } = await import('../src/routes.js');
    vi.mocked(prisma.user.count).mockResolvedValue(0);
    userCreateMock.mockResolvedValue({
      id: 'admin_1',
      email: 'admin@example.com',
      name: 'admin@example.com',
      roles: [{ role: 'ADMIN' }, { role: 'USER' }],
    });

    const app = Fastify();
    await app.register(sensible);
    app.decorate('authenticate', async () => {});
    await app.register(registerRoutes);

    const res = await app.inject({
      method: 'POST',
      url: '/setup/first-admin',
      payload: {
        email: 'admin@example.com',
        name: 'admin@example.com',
        password: 'changeme123',
        demoMode: true,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(hashPasswordMock).toHaveBeenCalledWith('changeme123');
    expect(seedDemoWorkspaceMock).toHaveBeenCalledWith({
      id: 'admin_1',
      email: 'admin@example.com',
      name: 'admin@example.com',
    }, 'hashed-password');
    expect(userCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          passwordHash: 'hashed-password',
        }),
      }),
    );
    expect(issueAuthTokensMock).toHaveBeenCalled();
    await app.close();
  });

  it('creates only the original admin password in non-demo mode', async () => {
    const { prisma } = await import('../src/prisma.js');
    const { registerRoutes } = await import('../src/routes.js');
    vi.mocked(prisma.user.count).mockResolvedValue(0);
    userCreateMock.mockResolvedValue({
      id: 'admin_1',
      email: 'admin@example.com',
      name: 'admin@example.com',
      roles: [{ role: 'ADMIN' }, { role: 'USER' }],
    });

    const app = Fastify();
    await app.register(sensible);
    app.decorate('authenticate', async () => {});
    await app.register(registerRoutes);

    const res = await app.inject({
      method: 'POST',
      url: '/setup/first-admin',
      payload: {
        email: 'admin@example.com',
        name: 'admin@example.com',
        password: 'changeme123',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(hashPasswordMock).toHaveBeenCalledWith('changeme123');
    expect(userCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          passwordHash: 'hashed-password',
        }),
      }),
    );
    expect(seedDemoWorkspaceMock).not.toHaveBeenCalled();
    expect(issueAuthTokensMock).toHaveBeenCalled();
    await app.close();
  });

  it('blocks non-admin from inviting guides for other users', async () => {
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
      url: '/guides/invite',
      payload: { email: 'guide@example.com', targetMemberId: 'u2' },
    });

    expect(res.statusCode).toBe(403);
    expect(sendEmailMock).not.toHaveBeenCalled();
    await app.close();
  });

  it('returns member workspace data for authenticated guides', async () => {
    userFindUniqueMock.mockResolvedValue({
      id: 'u1',
      reviewTargets: [
        {
          mode: 'active',
          canActOnItems: true,
          canManageRoutines: true,
          canManageAccountability: true,
          historyWindow: 'Last 30 days + next due',
          hiddenItemCount: 1,
          createdAt: new Date('2026-03-10T07:00:00.000Z'),
          reviewee: {
            id: 'u2',
            email: 'member@example.com',
            name: 'Member',
            items: [
              {
                id: 'item_1',
                title: 'Morning meds',
                category: 'health',
                scheduleKind: 'DAILY',
                scheduleData: { kind: 'DAILY', dailyTimes: ['08:00'] },
                createdAt: new Date('2026-03-10T08:00:00.000Z'),
                completions: [
                  {
                    id: 'completion_1',
                    occurredAt: new Date('2026-03-12T08:00:00.000Z'),
                    note: 'Handled before school',
                  },
                ],
              },
            ],
          },
        },
      ],
    });
    const { registerRoutes } = await import('../src/routes.js');

    const app = Fastify();
    app.decorate(
      'authenticate',
      async (request: { user?: { id: string; email: string; roles: string[] } }) => {
        request.user = { id: 'u1', email: 'guide@example.com', roles: ['USER'] };
      },
    );
    await app.register(registerRoutes);

    const res = await app.inject({ method: 'GET', url: '/members' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([
      {
        member: {
          id: 'u2',
          email: 'member@example.com',
          name: 'Member',
          items: [
            {
              id: 'item_1',
              title: 'Morning meds',
              category: 'health',
              scheduleKind: 'DAILY',
              scheduleData: { kind: 'DAILY', dailyTimes: ['08:00'] },
              createdAt: '2026-03-10T08:00:00.000Z',
              completions: [
                {
                  id: 'completion_1',
                  occurredAt: '2026-03-12T08:00:00.000Z',
                  note: 'Handled before school',
                },
              ],
            },
          ],
        },
        relationship: {
          mode: 'active',
          canActOnItems: true,
          canManageRoutines: true,
          canManageFollowThrough: true,
          historyWindow: 'Last 30 days + next due',
          hiddenItemCount: 1,
          createdAt: '2026-03-10T07:00:00.000Z',
        },
        items: [
          {
            id: 'item_1',
            title: 'Morning meds',
            category: 'health',
            scheduleKind: 'DAILY',
            scheduleData: { kind: 'DAILY', dailyTimes: ['08:00'] },
            createdAt: '2026-03-10T08:00:00.000Z',
            completions: [
              {
                id: 'completion_1',
                occurredAt: '2026-03-12T08:00:00.000Z',
                note: 'Handled before school',
              },
            ],
          },
        ],
      },
    ]);
    await app.close();
  });

  it('returns attributed audit history for account and guided-member activity', async () => {
    userFindUniqueMock.mockResolvedValue({
      id: 'u1',
      name: 'Guide User',
      createdAt: new Date('2026-03-01T08:00:00.000Z'),
      reviewers: [
        {
          reviewerId: 'u4',
          revieweeId: 'u1',
          createdAt: new Date('2026-03-02T08:00:00.000Z'),
          historyWindow: 'Last 30 days + next due',
          mode: 'active',
          reviewer: {
            id: 'u4',
            name: 'Jordan',
          },
        },
      ],
      reviewTargets: [
        {
          reviewerId: 'u1',
          revieweeId: 'u2',
          createdAt: new Date('2026-03-10T08:00:00.000Z'),
          historyWindow: 'Future only',
          mode: 'passive',
          reviewee: {
            id: 'u2',
            name: 'Alex',
            items: [
              {
                id: 'item_2',
                title: 'Speech practice',
                createdAt: new Date('2026-03-11T08:00:00.000Z'),
                completions: [
                  {
                    id: 'completion_2',
                    occurredAt: new Date('2026-03-13T08:00:00.000Z'),
                    note: 'Focused session',
                    user: {
                      id: 'u2',
                      name: 'Alex',
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
      items: [
        {
          id: 'item_1',
          title: 'Morning meds',
          createdAt: new Date('2026-03-05T08:00:00.000Z'),
          completions: [
            {
              id: 'completion_1',
              occurredAt: new Date('2026-03-12T08:00:00.000Z'),
              note: 'Handled early',
              user: {
                id: 'u1',
                name: 'Guide User',
              },
            },
          ],
        },
      ],
      sentInvites: [
        {
          id: 'inv_1',
          inviteeMail: 'newguide@example.com',
          createdAt: new Date('2026-03-09T08:00:00.000Z'),
          acceptedAt: null,
          invitee: null,
        },
      ],
    });
    const { registerRoutes } = await import('../src/routes.js');

    const app = Fastify();
    app.decorate(
      'authenticate',
      async (request: { user?: { id: string; email: string; roles: string[] } }) => {
        request.user = { id: 'u1', email: 'guide@example.com', roles: ['USER'] };
      },
    );
    await app.register(registerRoutes);

    const res = await app.inject({ method: 'GET', url: '/history/audit' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([
      expect.objectContaining({
        category: 'activity',
        scope: 'member',
        subjectName: 'Alex',
        title: 'Alex recorded activity on Speech practice',
        actorName: 'Alex',
      }),
      expect.objectContaining({
        category: 'activity',
        scope: 'self',
        subjectName: 'Guide User',
        title: 'Recorded activity on Morning meds',
        actorName: 'Guide User',
      }),
      expect.objectContaining({
        category: 'routine',
        scope: 'member',
        title: 'Alex added Speech practice',
      }),
      expect.objectContaining({
        category: 'relationship',
        scope: 'member',
        title: 'Guide relationship started with Alex',
      }),
      expect.objectContaining({
        category: 'invite',
        title: 'Sent guide invite to newguide@example.com',
      }),
      expect.objectContaining({
        category: 'routine',
        scope: 'self',
        title: 'Created Morning meds',
      }),
      expect.objectContaining({
        category: 'relationship',
        scope: 'guide',
        title: 'Jordan became your guide',
      }),
      expect.objectContaining({
        category: 'account',
        title: 'Account created',
      }),
    ]);
    await app.close();
  });
});
