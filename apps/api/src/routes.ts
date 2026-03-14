import type { FastifyInstance } from 'fastify';
import { registerGuideAdminRoutes } from './routes/guideAdmin.js';
import { registerSetupAuthRoutes } from './routes/setupAuth.js';
import { registerUserItemRoutes } from './routes/userItems.js';
import { registerValidationRoutes } from './routes/validation.js';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await registerSetupAuthRoutes(app);
  await registerUserItemRoutes(app);
  await registerGuideAdminRoutes(app);
  await registerValidationRoutes(app);
}
