import dayjs from 'dayjs';
import { prisma } from './prisma.js';
import { sendEmail } from './email.js';

async function completionRate(userId: string, start: Date, end: Date): Promise<number> {
  const itemCount = await prisma.trackingItem.count({ where: { ownerId: userId } });
  if (itemCount === 0) return 1;

  const completionCount = await prisma.trackingCompletion.count({
    where: {
      userId,
      occurredAt: {
        gte: start,
        lt: end,
      },
    },
  });

  return Math.min(1, completionCount / Math.max(itemCount, 1));
}

export async function sendWeeklyDigests(referenceDate = new Date()): Promise<void> {
  const start = dayjs(referenceDate).subtract(7, 'day').toDate();
  const end = dayjs(referenceDate).toDate();

  const users = await prisma.user.findMany({
    include: {
      reviewTargets: {
        include: {
          reviewee: true,
        },
      },
    },
  });

  for (const user of users) {
    const targets = [
      user,
      ...user.reviewTargets.map((relation: { reviewee: { id: string; name: string; email: string } }) => relation.reviewee),
    ];
    const lines: string[] = [];

    for (const target of targets) {
      const rate = await completionRate(target.id, start, end);
      lines.push(`${target.name} (${target.email}): ${(rate * 100).toFixed(0)}%`);
    }

    await sendEmail({
      to: [user.email],
      subject: 'Weekly leaf Digest',
      text: [`Weekly digest (${start.toISOString()} - ${end.toISOString()})`, ...lines].join('\n'),
    });
  }
}
