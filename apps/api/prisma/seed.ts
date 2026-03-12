import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth.js';

const prisma = new PrismaClient();

async function seed() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin',
      passwordHash: await hashPassword('changeme123'),
      roles: {
        create: [{ role: 'ADMIN' }, { role: 'USER' }],
      },
    },
  });

  console.log(`Seeded ${admin.email}`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
