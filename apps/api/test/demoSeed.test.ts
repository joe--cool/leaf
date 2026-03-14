import { beforeEach, describe, expect, it, vi } from 'vitest';

const userUpdateMock = vi.fn();
const userCreateMock = vi.fn();
const reviewerRelationCreateManyMock = vi.fn();
const trackingItemCreateMock = vi.fn();
const trackingCompletionCreateMock = vi.fn();
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
    reviewerRelationCreateManyMock.mockResolvedValue({ count: 3 });
    userUpdateMock.mockResolvedValue({});
    transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        user: {
          update: userUpdateMock,
          create: userCreateMock,
        },
        reviewerRelation: {
          createMany: reviewerRelationCreateManyMock,
        },
        trackingItem: {
          create: trackingItemCreateMock,
        },
        trackingCompletion: {
          create: trackingCompletionCreateMock,
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
});
