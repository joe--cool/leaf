import 'fastify';
import type { FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: import('fastify').FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    user: {
      id: string;
      email: string;
      roles: string[];
    };
  }
}
