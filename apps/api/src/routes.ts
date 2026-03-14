import type { FastifyInstance } from 'fastify';
import { registerReviewerAdminRoutes } from './routes/reviewerAdmin.js';
import { registerSetupAuthRoutes } from './routes/setupAuth.js';
import { registerUserItemRoutes } from './routes/userItems.js';
import { registerValidationRoutes } from './routes/validation.js';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await registerSetupAuthRoutes(app);
  await registerUserItemRoutes(app);
  await registerReviewerAdminRoutes(app);
  await registerValidationRoutes(app);
}
