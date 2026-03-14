import type { FastifyInstance } from 'fastify';
import { scheduleSchema } from '@leaf/shared';
import { z } from 'zod';

export async function registerValidationRoutes(app: FastifyInstance): Promise<void> {
  app.post('/validate/schedule', async (request) => {
    const body = z.object({ schedule: z.unknown() }).parse(request.body);
    return scheduleSchema.parse(body.schedule);
  });
}
