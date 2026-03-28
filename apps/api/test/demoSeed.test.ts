import { beforeEach, describe, expect, it, vi } from 'vitest';

const userUpdateMock = vi.fn();
const userCreateMock = vi.fn();
const reviewerRelationCreateMock = vi.fn();
const trackingItemCreateMock = vi.fn();
const trackingCompletionCreateMock = vi.fn();
const trackingItemActionCreateMock = vi.fn();
const retrospectiveCreateMock = vi.fn();
const retrospectiveContributionCreateMock = vi.fn();
const transactionMock = vi.fn();

vi.mock('../src/prisma.js', () => ({
  prisma: {
    $transaction: transactionMock,
  },
}));

describe('demoSeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userCreateMock
      .mockResolvedValueOnce({ id: 'u_jordan' })
      .mockResolvedValueOnce({ id: 'u_sam' })
      .mockResolvedValueOnce({ id: 'u_morgan' });
    trackingItemCreateMock.mockImplementation(async ({ data }: { data: { ownerId: string } }) => ({
      id: `item_${data.ownerId}_${trackingItemCreateMock.mock.calls.length}`,
    }));
    trackingCompletionCreateMock.mockResolvedValue({ id: 'completion_1' });
    trackingItemActionCreateMock.mockResolvedValue({ id: 'item_action_1' });
    reviewerRelationCreateMock
      .mockResolvedValueOnce({ id: 'rel_admin_jordan' })
      .mockResolvedValueOnce({ id: 'rel_admin_morgan' })
      .mockResolvedValueOnce({ id: 'rel_sam_admin' });
    userUpdateMock.mockResolvedValue({});
    retrospectiveCreateMock.mockResolvedValue({ id: 'retro_1' });
    retrospectiveContributionCreateMock.mockResolvedValue({ id: 'retro_note_1' });
    transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        user: {
          update: userUpdateMock,
          create: userCreateMock,
        },
        reviewerRelation: {
          create: reviewerRelationCreateMock,
        },
        trackingItem: {
          create: trackingItemCreateMock,
        },
        trackingCompletion: {
          create: trackingCompletionCreateMock,
        },
        trackingItemAction: {
          create: trackingItemActionCreateMock,
        },
        retrospective: {
          create: retrospectiveCreateMock,
        },
        retrospectiveContribution: {
          create: retrospectiveContributionCreateMock,
        },
      }),
    );
  });

  it('reuses the original password hash for all spoofed demo users', async () => {
    const { seedDemoWorkspace } = await import('../src/demoSeed.js');

    await seedDemoWorkspace(
      {
        id: 'admin_1',
        email: 'admin@example.com',
        name: 'Admin',
      },
      'shared-password-hash',
    );

    expect(userCreateMock).toHaveBeenCalledTimes(3);
    for (const [call] of userCreateMock.mock.calls) {
      expect(call.data.passwordHash).toBe('shared-password-hash');
    }
  });

  it('seeds a longer retrospective history across multiple demo members', async () => {
    const { seedDemoWorkspace } = await import('../src/demoSeed.js');

    await seedDemoWorkspace(
      {
        id: 'admin_1',
        email: 'admin@example.com',
        name: 'Admin',
      },
      'shared-password-hash',
    );

    expect(retrospectiveCreateMock).toHaveBeenCalledTimes(6);
    expect(retrospectiveContributionCreateMock).toHaveBeenCalledTimes(10);

    const createdSubjects = retrospectiveCreateMock.mock.calls.map(([call]) => call.data.subjectUserId);
    expect(createdSubjects).toEqual(
      expect.arrayContaining(['admin_1', 'u_jordan', 'u_morgan']),
    );
  });
});
