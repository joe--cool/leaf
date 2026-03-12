import type { FastifyRequest } from 'fastify';

export type JwtUser = {
  id: string;
  email: string;
  roles: string[];
};

export type AuthenticatedRequest = FastifyRequest & {
  user: JwtUser;
};
