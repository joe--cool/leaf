import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { registerGuideAdminRoutes } from './routes/guideAdmin.js';
import { registerHistoryRoutes } from './routes/history.js';
import { registerRetrospectiveRoutes } from './routes/retrospectives.js';
import { registerSetupAuthRoutes } from './routes/setupAuth.js';
import { registerUserItemRoutes } from './routes/userItems.js';
import { registerValidationRoutes } from './routes/validation.js';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      void reply.status(400).send({
        message: 'Validation error',
        issues: error.issues,
      });
      return;
    }
    void reply.send(error);
  });

  await registerSetupAuthRoutes(app);
  await registerUserItemRoutes(app);
  await registerGuideAdminRoutes(app);
  await registerHistoryRoutes(app);
  await registerRetrospectiveRoutes(app);
  await registerValidationRoutes(app);
}
