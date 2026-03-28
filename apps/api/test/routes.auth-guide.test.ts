import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const userRolesMock = vi.fn();
const enabledProvidersMock = vi.fn();
const sendEmailMock = vi.fn();
const inviteCreateMock = vi.fn();
const inviteFindUniqueMock = vi.fn();
const inviteUpdateMock = vi.fn();
const userFindUniqueMock = vi.fn();
const userFindManyMock = vi.fn();
const userUpdateMock = vi.fn();
const seedDemoWorkspaceMock = vi.fn();
const userCreateMock = vi.fn();
const issueAuthTokensMock = vi.fn();
const hashPasswordMock = vi.fn();
const reviewerRelationUpsertMock = vi.fn();
const transactionMock = vi.fn();
const reviewerRelationFindUniqueMock = vi.fn();
const retrospectiveFindManyMock = vi.fn();
const retrospectiveFindUniqueMock = vi.fn();
const retrospectiveCreateMock = vi.fn();
const retrospectiveUpdateMock = vi.fn();
const retrospectiveContributionCreateMock = vi.fn();
const trackingItemFindUniqueMock = vi.fn();
const trackingItemFindManyMock = vi.fn();
const trackingItemUpdateMock = vi.fn();
const trackingItemActionUpsertMock = vi.fn();
const trackingCompletionCreateMock = vi.fn();

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
      findMany: userFindManyMock,
      create: userCreateMock,
      update: userUpdateMock,
    },
    invite: {
      create: inviteCreateMock,
      findUnique: inviteFindUniqueMock,
      update: inviteUpdateMock,
    },
    reviewerRelation: {
      create: vi.fn(),
      upsert: reviewerRelationUpsertMock,
      findUnique: reviewerRelationFindUniqueMock,
    },
    userRole: {
      upsert: vi.fn(),
    },
    trackingItem: {
      create: vi.fn(),
      findUnique: trackingItemFindUniqueMock,
      findMany: trackingItemFindManyMock,
      update: trackingItemUpdateMock,
    },
    trackingCompletion: {
      create: trackingCompletionCreateMock,
    },
    trackingItemAction: {
      upsert: trackingItemActionUpsertMock,
    },
    retrospective: {
      findMany: retrospectiveFindManyMock,
      findUnique: retrospectiveFindUniqueMock,
      create: retrospectiveCreateMock,
      update: retrospectiveUpdateMock,
    },
    retrospectiveContribution: {
      create: retrospectiveContributionCreateMock,
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: transactionMock,
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
    transactionMock.mockImplementation(async (input: unknown) => {
      if (typeof input === 'function') {
        return input((await import('../src/prisma.js')).prisma);
      }
      return Promise.all(input as Promise<unknown>[]);
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

  it('updates an existing item for the owner', async () => {
    const { registerRoutes } = await import('../src/routes.js');

    trackingItemFindUniqueMock.mockResolvedValue({
      id: 'item_1',
      ownerId: 'u1',
    });
    trackingItemUpdateMock.mockResolvedValue({ id: 'item_1' });

    const app = Fastify();
    await app.register(sensible);
    app.decorate('authenticate', async (request: { user?: { id: string; email: string; roles: string[] } }) => {
      request.user = { id: 'u1', email: 'u1@example.com', roles: ['USER'] };
    });
    await app.register(registerRoutes);

    const res = await app.inject({
      method: 'PUT',
      url: '/items/item_1',
      payload: {
        title: 'Updated item',
        category: 'health',
        schedule: {
          kind: 'ONE_TIME',
          oneTimeAt: '2026-03-29T16:00:00.000Z',
          timezone: 'UTC',
        },
        notificationEnabled: true,
        notificationHardToDismiss: false,
        notificationRepeatMinutes: 15,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(trackingItemFindUniqueMock).toHaveBeenCalledWith({ where: { id: 'item_1' } });
    expect(trackingItemUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'item_1' },
        data: expect.objectContaining({
          title: 'Updated item',
          scheduleKind: 'ONE_TIME',
        }),
      }),
    );
    await app.close();
  });

  it('returns not found when updating an item owned by someone else', async () => {
    const { registerRoutes } = await import('../src/routes.js');

    trackingItemFindUniqueMock.mockResolvedValue({
      id: 'item_1',
      ownerId: 'u2',
    });

    const app = Fastify();
    await app.register(sensible);
    app.decorate('authenticate', async (request: { user?: { id: string; email: string; roles: string[] } }) => {
      request.user = { id: 'u1', email: 'u1@example.com', roles: ['USER'] };
    });
    await app.register(registerRoutes);

    const res = await app.inject({
      method: 'PUT',
      url: '/items/item_1',
      payload: {
        title: 'Updated item',
        category: 'health',
        schedule: {
          kind: 'ONE_TIME',
          oneTimeAt: '2026-03-29T16:00:00.000Z',
          timezone: 'UTC',
        },
        notificationEnabled: true,
        notificationHardToDismiss: false,
        notificationRepeatMinutes: 15,
      },
    });

    expect(res.statusCode).toBe(404);
    expect(trackingItemUpdateMock).not.toHaveBeenCalled();
    await app.close();
  });

  it('rejects invalid item update payloads before persistence', async () => {
    const { registerRoutes } = await import('../src/routes.js');

    const app = Fastify();
    await app.register(sensible);
    app.decorate('authenticate', async (request: { user?: { id: string; email: string; roles: string[] } }) => {
      request.user = { id: 'u1', email: 'u1@example.com', roles: ['USER'] };
    });
    await app.register(registerRoutes);

    const res = await app.inject({
      method: 'PUT',
      url: '/items/item_1',
      payload: {
        title: 'Updated item',
        category: 'health',
        schedule: {
          kind: 'ONE_TIME',
          oneTimeAt: '2026-03-29T16:00:00.000Z',
          timezone: 'UTC',
        },
        notificationEnabled: true,
        notificationHardToDismiss: false,
        notificationRepeatMinutes: 0,
      },
    });

    expect(res.statusCode).toBe(400);
    expect(trackingItemFindUniqueMock).not.toHaveBeenCalled();
    expect(trackingItemUpdateMock).not.toHaveBeenCalled();
    await app.close();
  });

  it('records a skip occurrence action for the owner', async () => {
    const { registerRoutes } = await import('../src/routes.js');

    trackingItemFindUniqueMock.mockResolvedValue({
      id: 'item_1',
      ownerId: 'u1',
    });
    trackingItemActionUpsertMock.mockResolvedValue({ id: 'act_1', kind: 'SKIP' });

    const app = Fastify();
    await app.register(sensible);
    app.decorate('authenticate', async (request: { user?: { id: string; email: string; roles: string[] } }) => {
      request.user = { id: 'u1', email: 'u1@example.com', roles: ['USER'] };
    });
    await app.register(registerRoutes);

    const res = await app.inject({
      method: 'POST',
      url: '/items/item_1/actions',
      payload: {
        kind: 'skip',
        targetAt: '2026-03-29T16:00:00.000Z',
        note: 'Handled elsewhere today.',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(trackingItemActionUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          itemId_userId_kind_targetAt: {
            itemId: 'item_1',
            userId: 'u1',
            kind: 'SKIP',
            targetAt: new Date('2026-03-29T16:00:00.000Z'),
          },
        },
      }),
    );
    await app.close();
  });

  it('records a completion occurrence action with target attribution', async () => {
    const { registerRoutes } = await import('../src/routes.js');

    trackingItemFindUniqueMock.mockResolvedValue({
      id: 'item_1',
      ownerId: 'u1',
    });
    trackingCompletionCreateMock.mockResolvedValue({ id: 'cmp_1' });

    const app = Fastify();
    await app.register(sensible);
    app.decorate('authenticate', async (request: { user?: { id: string; email: string; roles: string[] } }) => {
      request.user = { id: 'u1', email: 'u1@example.com', roles: ['USER'] };
    });
    await app.register(registerRoutes);

    const res = await app.inject({
      method: 'POST',
      url: '/items/item_1/actions',
      payload: {
        kind: 'complete',
        targetAt: '2026-03-29T16:00:00.000Z',
        note: 'Finished from My Items.',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(trackingCompletionCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          itemId: 'item_1',
          userId: 'u1',
          targetAt: new Date('2026-03-29T16:00:00.000Z'),
          note: 'Finished from My Items.',
        }),
      }),
    );
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

  it('returns invite preview with relationship proposal and target member context', async () => {
    inviteFindUniqueMock.mockResolvedValue({
      id: 'inv_1',
      token: 'tok',
      type: 'GUIDE',
      inviteeMail: 'newguide@example.com',
      acceptedAt: null,
      expiresAt: new Date('2099-03-21T08:00:00.000Z'),
      targetUserId: 'u2',
      relationshipTemplateId: 'active-guide',
      relationshipMode: 'active',
      canActOnItems: true,
      canManageRoutines: true,
      canManageAccountability: true,
      historyWindow: 'Last 30 days + next due',
      inviter: { id: 'u1', name: 'Alex', email: 'alex@example.com' },
    });
    userFindUniqueMock.mockResolvedValueOnce({
      id: 'u2',
      name: 'Jordan',
      email: 'jordan@example.com',
    });
    const { registerRoutes } = await import('../src/routes.js');

    const app = Fastify();
    await app.register(sensible);
    app.decorate('authenticate', async () => {});
    await app.register(registerRoutes);

    const res = await app.inject({ method: 'GET', url: '/invites/tok' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      token: 'tok',
      inviteeEmail: 'newguide@example.com',
      expiresAt: '2099-03-21T08:00:00.000Z',
      inviter: { id: 'u1', name: 'Alex', email: 'alex@example.com' },
      member: { id: 'u2', name: 'Jordan', email: 'jordan@example.com' },
      proposedRelationship: {
        templateId: 'active-guide',
        mode: 'active',
        canActOnItems: true,
        canManageRoutines: true,
        canManageFollowThrough: true,
        historyWindow: 'Last 30 days + next due',
      },
    });
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
                actions: [],
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
              actions: [],
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
            actions: [],
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
                actions: [],
              },
            ],
            retrospectivesOwned: [],
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
          actions: [],
        },
      ],
      retrospectivesOwned: [],
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

  it('returns retrospective artifacts that respect the guide history window', async () => {
    retrospectiveFindManyMock.mockResolvedValue([
      {
        id: 'retro_visible',
        kind: 'scheduled',
        title: 'Weekly reflection · Alex',
        summaryText: 'The shorter routine was easier to restart this week.',
        promptPreset: 'weekly-review',
        prompts: ['What went well?', 'What changed next?'],
        audienceSummary: 'Alex and Guide User',
        visibilitySummary: 'Visible while the history window includes this period.',
        periodStart: new Date('2026-03-10T00:00:00.000Z'),
        periodEnd: new Date('2026-03-13T00:00:00.000Z'),
        createdAt: new Date('2026-03-13T12:00:00.000Z'),
        updatedAt: new Date('2026-03-13T12:00:00.000Z'),
        subjectUserId: 'u2',
        createdById: 'u1',
        relationId: 'rel_1',
        subjectUser: { id: 'u2', name: 'Alex' },
        createdBy: { id: 'u1', name: 'Guide User' },
        relation: {
          id: 'rel_1',
          reviewerId: 'u1',
          revieweeId: 'u2',
          canManageAccountability: true,
          historyWindow: 'Last 30 days + next due',
          createdAt: new Date('2026-03-01T00:00:00.000Z'),
        },
        contributions: [
          {
            id: 'note_1',
            body: 'We shortened the task and it helped.',
            createdAt: new Date('2026-03-13T13:00:00.000Z'),
            authorId: 'u2',
            author: { id: 'u2', name: 'Alex' },
          },
        ],
      },
      {
        id: 'retro_hidden',
        kind: 'manual',
        title: 'Old Impromptu Reflection',
        summaryText: 'Old summary',
        promptPreset: 'reset-and-obstacles',
        prompts: ['What blocked Alex?'],
        audienceSummary: 'Alex and Guide User',
        visibilitySummary: 'Hidden outside the relationship window.',
        periodStart: new Date('2026-01-01T00:00:00.000Z'),
        periodEnd: new Date('2026-01-07T00:00:00.000Z'),
        createdAt: new Date('2026-01-07T12:00:00.000Z'),
        updatedAt: new Date('2026-01-07T12:00:00.000Z'),
        subjectUserId: 'u2',
        createdById: 'u1',
        relationId: 'rel_1',
        subjectUser: { id: 'u2', name: 'Alex' },
        createdBy: { id: 'u1', name: 'Guide User' },
        relation: {
          id: 'rel_1',
          reviewerId: 'u1',
          revieweeId: 'u2',
          canManageAccountability: true,
          historyWindow: 'Last 30 days + next due',
          createdAt: new Date('2026-03-01T00:00:00.000Z'),
        },
        contributions: [],
      },
    ]);

    const { registerRoutes } = await import('../src/routes.js');
    const app = Fastify();
    app.decorate(
      'authenticate',
      async (request: { user?: { id: string; email: string; roles: string[] } }) => {
        request.user = { id: 'u1', email: 'guide@example.com', roles: ['USER'] };
      },
    );
    await app.register(registerRoutes);

    const res = await app.inject({ method: 'GET', url: '/retrospectives' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([
      expect.objectContaining({
        id: 'retro_visible',
        title: 'Weekly reflection · Alex',
        canContribute: true,
        summary: 'The shorter routine was easier to restart this week.',
        contributions: [
          expect.objectContaining({
            body: 'We shortened the task and it helped.',
            authorName: 'Alex',
          }),
        ],
      }),
    ]);
    await app.close();
  });

  it('keeps recent lookback reflections visible even when the relationship was created later', async () => {
    retrospectiveFindManyMock.mockResolvedValue([
      {
        id: 'retro_recent',
        kind: 'scheduled',
        title: 'Weekly reflection · Alex',
        summaryText: 'Recent reflection inside the lookback window.',
        promptPreset: 'weekly-review',
        prompts: ['What went well?'],
        audienceSummary: 'Alex and Guide User',
        visibilitySummary: 'Visible while the history window includes this period.',
        periodStart: new Date('2026-03-08T00:00:00.000Z'),
        periodEnd: new Date('2026-03-14T00:00:00.000Z'),
        createdAt: new Date('2026-03-14T12:00:00.000Z'),
        updatedAt: new Date('2026-03-14T12:00:00.000Z'),
        subjectUserId: 'u2',
        createdById: 'u1',
        relationId: 'rel_1',
        subjectUser: { id: 'u2', name: 'Alex', reflectionPrompt: null },
        createdBy: { id: 'u1', name: 'Guide User' },
        relation: {
          id: 'rel_1',
          reviewerId: 'u1',
          revieweeId: 'u2',
          canManageAccountability: true,
          historyWindow: 'Last 30 days + next due',
          createdAt: new Date('2026-03-14T15:00:00.000Z'),
        },
        contributions: [],
      },
    ]);

    const { registerRoutes } = await import('../src/routes.js');
    const app = Fastify();
    app.decorate(
      'authenticate',
      async (request: { user?: { id: string; email: string; roles: string[] } }) => {
        request.user = { id: 'u1', email: 'guide@example.com', roles: ['USER'] };
      },
    );
    await app.register(registerRoutes);

    const res = await app.inject({ method: 'GET', url: '/retrospectives' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([
      expect.objectContaining({
        id: 'retro_recent',
        summary: 'Recent reflection inside the lookback window.',
      }),
    ]);
    await app.close();
  });

  it('creates a guided-member reflection with a summary', async () => {
    userFindUniqueMock.mockResolvedValue({
      id: 'u2',
      name: 'Alex',
      reviewers: [],
    });
    reviewerRelationFindUniqueMock.mockResolvedValue({
      id: 'rel_1',
      reviewerId: 'u1',
      revieweeId: 'u2',
      canManageAccountability: true,
      historyWindow: 'Last 30 days + next due',
      reviewer: { id: 'u1', name: 'Guide User' },
      reviewee: { id: 'u2', name: 'Alex' },
    });
    retrospectiveCreateMock.mockResolvedValue({ id: 'retro_new' });
    retrospectiveFindUniqueMock.mockResolvedValue({
      id: 'retro_new',
      kind: 'manual',
      title: 'Impromptu Reflection · Alex · Mar 10 to Mar 13',
      summaryText: 'We are moving the session earlier in the day.',
      promptPreset: 'support-check-in',
      prompts: ['What support helped Alex most?'],
      audienceSummary: 'Alex and Guide User',
      visibilitySummary: 'Visible while the history window includes this period.',
      periodStart: new Date('2026-03-10T00:00:00.000Z'),
      periodEnd: new Date('2026-03-14T00:00:00.000Z'),
      createdAt: new Date('2026-03-14T01:00:00.000Z'),
      updatedAt: new Date('2026-03-14T01:00:00.000Z'),
      subjectUserId: 'u2',
      createdById: 'u1',
      relationId: 'rel_1',
      subjectUser: { id: 'u2', name: 'Alex' },
      createdBy: { id: 'u1', name: 'Guide User' },
      relation: {
        id: 'rel_1',
        reviewerId: 'u1',
        revieweeId: 'u2',
        canManageAccountability: true,
        historyWindow: 'Last 30 days + next due',
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
      },
      contributions: [
        {
          id: 'note_1',
          body: 'We are moving the session earlier in the day.',
          createdAt: new Date('2026-03-14T01:05:00.000Z'),
          authorId: 'u1',
          author: { id: 'u1', name: 'Guide User' },
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

    const res = await app.inject({
      method: 'POST',
      url: '/retrospectives',
      payload: {
        subjectUserId: 'u2',
        kind: 'manual',
        periodStart: '2026-03-10T00:00:00.000Z',
        periodEnd: '2026-03-14T00:00:00.000Z',
        promptPreset: 'support-check-in',
        summary: 'We are moving the session earlier in the day.',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(retrospectiveCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subjectUserId: 'u2',
          relationId: 'rel_1',
          createdById: 'u1',
          kind: 'manual',
          summaryText: 'We are moving the session earlier in the day.',
        }),
      }),
    );
    expect(retrospectiveContributionCreateMock).not.toHaveBeenCalled();
    expect(res.json()).toEqual(
      expect.objectContaining({
        id: 'retro_new',
        title: 'Impromptu Reflection · Alex · Mar 10 to Mar 13',
        summary: 'We are moving the session earlier in the day.',
        canContribute: true,
      }),
    );
    await app.close();
  });

  it('updates the reflection summary without creating a note entry', async () => {
    retrospectiveFindUniqueMock
      .mockResolvedValueOnce({
        id: 'retro_new',
        kind: 'manual',
        title: 'Impromptu Reflection · Alex · Mar 10 to Mar 13',
        summaryText: 'Original summary',
        promptPreset: 'support-check-in',
        prompts: ['What support helped Alex most?'],
        audienceSummary: 'Alex and Guide User',
        visibilitySummary: 'Visible while the history window includes this period.',
        periodStart: new Date('2026-03-10T00:00:00.000Z'),
        periodEnd: new Date('2026-03-14T00:00:00.000Z'),
        createdAt: new Date('2026-03-14T01:00:00.000Z'),
        updatedAt: new Date('2026-03-14T01:00:00.000Z'),
        subjectUserId: 'u2',
        createdById: 'u1',
        relationId: 'rel_1',
        subjectUser: { id: 'u2', name: 'Alex', reflectionPrompt: null },
        createdBy: { id: 'u1', name: 'Guide User' },
        relation: {
          id: 'rel_1',
          reviewerId: 'u1',
          revieweeId: 'u2',
          canManageAccountability: true,
          historyWindow: 'Last 30 days + next due',
          createdAt: new Date('2026-03-01T00:00:00.000Z'),
        },
        contributions: [],
      })
      .mockResolvedValueOnce({
        id: 'retro_new',
        kind: 'manual',
        title: 'Impromptu Reflection · Alex · Mar 10 to Mar 13',
        summaryText: 'Updated summary',
        promptPreset: 'support-check-in',
        prompts: ['What support helped Alex most?'],
        audienceSummary: 'Alex and Guide User',
        visibilitySummary: 'Visible while the history window includes this period.',
        periodStart: new Date('2026-03-10T00:00:00.000Z'),
        periodEnd: new Date('2026-03-14T00:00:00.000Z'),
        createdAt: new Date('2026-03-14T01:00:00.000Z'),
        updatedAt: new Date('2026-03-14T01:10:00.000Z'),
        subjectUserId: 'u2',
        createdById: 'u1',
        relationId: 'rel_1',
        subjectUser: { id: 'u2', name: 'Alex', reflectionPrompt: null },
        createdBy: { id: 'u1', name: 'Guide User' },
        relation: {
          id: 'rel_1',
          reviewerId: 'u1',
          revieweeId: 'u2',
          canManageAccountability: true,
          historyWindow: 'Last 30 days + next due',
          createdAt: new Date('2026-03-01T00:00:00.000Z'),
        },
        contributions: [],
      });
    retrospectiveUpdateMock.mockResolvedValue({ id: 'retro_new' });

    const { registerRoutes } = await import('../src/routes.js');
    const app = Fastify();
    app.decorate(
      'authenticate',
      async (request: { user?: { id: string; email: string; roles: string[] } }) => {
        request.user = { id: 'u1', email: 'guide@example.com', roles: ['USER'] };
      },
    );
    await app.register(registerRoutes);

    const res = await app.inject({
      method: 'PATCH',
      url: '/retrospectives/retro_new',
      payload: {
        summary: 'Updated summary',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(retrospectiveUpdateMock).toHaveBeenCalledWith({
      where: { id: 'retro_new' },
      data: { summaryText: 'Updated summary' },
    });
    expect(retrospectiveContributionCreateMock).not.toHaveBeenCalled();
    expect(res.json()).toEqual(
      expect.objectContaining({
        id: 'retro_new',
        summary: 'Updated summary',
      }),
    );
    await app.close();
  });

  it('saves a member writing prompt through preferences when the guide can manage accountability', async () => {
    reviewerRelationFindUniqueMock.mockResolvedValue({
      id: 'rel_1',
      reviewerId: 'u1',
      revieweeId: 'u2',
      canManageAccountability: true,
    });
    userUpdateMock.mockResolvedValue({
      id: 'u2',
      email: 'alex@example.com',
      name: 'Alex',
      reflectionPrompt: 'Focus on what regained momentum this week.',
    });

    const { registerRoutes } = await import('../src/routes.js');
    const app = Fastify();
    await app.register(sensible);
    app.decorate(
      'authenticate',
      async (request: { user?: { id: string; email: string; roles: string[] } }) => {
        request.user = { id: 'u1', email: 'guide@example.com', roles: ['USER'] };
      },
    );
    await app.register(registerRoutes);

    const res = await app.inject({
      method: 'PATCH',
      url: '/me/preferences',
      payload: {
        targetMemberId: 'u2',
        reflectionPrompt: 'Focus on what regained momentum this week.',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(reviewerRelationFindUniqueMock).toHaveBeenCalledWith({
      where: {
        reviewerId_revieweeId: {
          reviewerId: 'u1',
          revieweeId: 'u2',
        },
      },
    });
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: 'u2' },
      data: expect.objectContaining({
        reflectionPrompt: 'Focus on what regained momentum this week.',
      }),
    });
    expect(res.json()).toEqual(
      expect.objectContaining({
        id: 'u2',
        reflectionPrompt: 'Focus on what regained momentum this week.',
      }),
    );
    await app.close();
  });

  it('blocks writing prompt updates when the guide lacks accountability permissions', async () => {
    reviewerRelationFindUniqueMock.mockResolvedValue({
      id: 'rel_1',
      reviewerId: 'u1',
      revieweeId: 'u2',
      canManageAccountability: false,
    });

    const { registerRoutes } = await import('../src/routes.js');
    const app = Fastify();
    await app.register(sensible);
    app.decorate(
      'authenticate',
      async (request: { user?: { id: string; email: string; roles: string[] } }) => {
        request.user = { id: 'u1', email: 'guide@example.com', roles: ['USER'] };
      },
    );
    await app.register(registerRoutes);

    const res = await app.inject({
      method: 'PATCH',
      url: '/me/preferences',
      payload: {
        targetMemberId: 'u2',
        reflectionPrompt: 'This should not save.',
      },
    });

    expect(res.statusCode).toBe(403);
    expect(userUpdateMock).not.toHaveBeenCalled();
    await app.close();
  });

  it('adds a reflective note to an existing reflection', async () => {
    retrospectiveFindUniqueMock
      .mockResolvedValueOnce({
        id: 'retro_new',
        kind: 'manual',
        title: 'Impromptu Reflection · Alex · Mar 10 to Mar 13',
        summaryText: 'Original summary',
        promptPreset: 'support-check-in',
        prompts: ['What support helped Alex most?'],
        audienceSummary: 'Alex and Guide User',
        visibilitySummary: 'Visible while the history window includes this period.',
        periodStart: new Date('2026-03-10T00:00:00.000Z'),
        periodEnd: new Date('2026-03-14T00:00:00.000Z'),
        createdAt: new Date('2026-03-14T01:00:00.000Z'),
        updatedAt: new Date('2026-03-14T01:00:00.000Z'),
        subjectUserId: 'u2',
        createdById: 'u1',
        relationId: 'rel_1',
        subjectUser: { id: 'u2', name: 'Alex', reflectionPrompt: null },
        createdBy: { id: 'u1', name: 'Guide User' },
        relation: {
          id: 'rel_1',
          reviewerId: 'u1',
          revieweeId: 'u2',
          canManageAccountability: true,
          historyWindow: 'Last 30 days + next due',
          createdAt: new Date('2026-03-01T00:00:00.000Z'),
        },
        contributions: [],
      })
      .mockResolvedValueOnce({
        id: 'retro_new',
        kind: 'manual',
        title: 'Impromptu Reflection · Alex · Mar 10 to Mar 13',
        summaryText: 'Original summary',
        promptPreset: 'support-check-in',
        prompts: ['What support helped Alex most?'],
        audienceSummary: 'Alex and Guide User',
        visibilitySummary: 'Visible while the history window includes this period.',
        periodStart: new Date('2026-03-10T00:00:00.000Z'),
        periodEnd: new Date('2026-03-14T00:00:00.000Z'),
        createdAt: new Date('2026-03-14T01:00:00.000Z'),
        updatedAt: new Date('2026-03-14T01:05:00.000Z'),
        subjectUserId: 'u2',
        createdById: 'u1',
        relationId: 'rel_1',
        subjectUser: { id: 'u2', name: 'Alex', reflectionPrompt: null },
        createdBy: { id: 'u1', name: 'Guide User' },
        relation: {
          id: 'rel_1',
          reviewerId: 'u1',
          revieweeId: 'u2',
          canManageAccountability: true,
          historyWindow: 'Last 30 days + next due',
          createdAt: new Date('2026-03-01T00:00:00.000Z'),
        },
        contributions: [
          {
            id: 'note_2',
            body: 'Alex agreed to move practice earlier.',
            createdAt: new Date('2026-03-14T01:05:00.000Z'),
            authorId: 'u1',
            author: { id: 'u1', name: 'Guide User' },
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

    const res = await app.inject({
      method: 'POST',
      url: '/retrospectives/retro_new/contributions',
      payload: {
        body: 'Alex agreed to move practice earlier.',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(retrospectiveContributionCreateMock).toHaveBeenCalledWith({
      data: {
        retrospectiveId: 'retro_new',
        authorId: 'u1',
        body: 'Alex agreed to move practice earlier.',
      },
    });
    expect(res.json()).toEqual(
      expect.objectContaining({
        id: 'retro_new',
        contributions: [
          expect.objectContaining({
            body: 'Alex agreed to move practice earlier.',
            authorName: 'Guide User',
          }),
        ],
      }),
    );
    await app.close();
  });
});
