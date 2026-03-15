import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { CronJob } from 'cron';
import { env } from './env.js';
import { authPlugin, hashPassword } from './auth.js';
import { registerRoutes } from './routes.js';
import { sendWeeklyDigests } from './weeklyDigest.js';
import { prisma } from './prisma.js';

export async function buildServer() {
  const app = Fastify({
    logger: true,
  });

  const allowedOrigins = env.CORS_ORIGIN.split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  await app.register(cors, {
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS origin not allowed: ${origin}`), false);
    },
    credentials: true,
  });
  await app.register(helmet);
  await app.register(rateLimit, {
    global: true,
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
  });
  await app.register(sensible);
  await app.register(authPlugin);
  await registerRoutes(app);

  return app;
}

async function bootstrapDefaultAdminIfEnabled() {
  if (!env.AUTO_BOOTSTRAP_ADMIN) return;
  const count = await prisma.user.count();
  if (count > 0) return;

  await prisma.user.create({
    data: {
      email: env.BOOTSTRAP_ADMIN_EMAIL,
      name: env.BOOTSTRAP_ADMIN_NAME,
      passwordHash: await hashPassword(env.BOOTSTRAP_ADMIN_PASSWORD),
      roles: {
        create: [{ role: 'ADMIN' }, { role: 'USER' }],
      },
    },
  });
}

async function main() {
  await bootstrapDefaultAdminIfEnabled();
  const app = await buildServer();
  await app.listen({ port: env.PORT, host: '0.0.0.0' });

  const digestJob = new CronJob('0 0 * * 1', async () => {
    await sendWeeklyDigests();
  });
  digestJob.start();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
