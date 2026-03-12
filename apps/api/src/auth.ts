import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { prisma } from './prisma.js';
import { env } from './env.js';

export const authPlugin = fp(async (app: FastifyInstance) => {
  await app.register(fastifyJwt, { secret: env.JWT_SECRET });

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.unauthorized('Invalid token');
    }
  });
});

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function userRoles(userId: string): Promise<string[]> {
  const roles = await prisma.userRole.findMany({ where: { userId } });
  return roles.map((entry: { role: string }) => entry.role);
}

export async function issueAuthTokens(params: {
  reply: FastifyReply;
  userId: string;
  email: string;
  roles: string[];
}): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = await params.reply.jwtSign({
    id: params.userId,
    email: params.email,
    roles: params.roles,
  });

  const refreshToken = crypto.randomBytes(48).toString('hex');
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: params.userId,
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  return { accessToken, refreshToken };
}

export async function rotateRefreshToken(params: {
  reply: FastifyReply;
  refreshToken: string;
}): Promise<{ accessToken: string; refreshToken: string; userId: string; email: string; roles: string[] }> {
  const token = await prisma.refreshToken.findUnique({
    where: { token: params.refreshToken },
    include: { user: { include: { roles: true } } },
  });

  if (!token || token.revokedAt || token.expiresAt < new Date()) {
    throw new Error('Invalid refresh token');
  }

  await prisma.refreshToken.update({
    where: { id: token.id },
    data: { revokedAt: new Date() },
  });

  const roles = token.user.roles.map((entry: { role: string }) => entry.role);
  const next = await issueAuthTokens({
    reply: params.reply,
    userId: token.user.id,
    email: token.user.email,
    roles,
  });

  return {
    ...next,
    userId: token.user.id,
    email: token.user.email,
    roles,
  };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { token, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
