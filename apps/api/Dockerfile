FROM node:24-alpine

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json eslint.config.mjs .prettierrc ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

COPY packages/shared packages/shared
COPY apps/api apps/api

RUN pnpm --filter @tracker/shared build
RUN pnpm --filter @tracker/api prisma:generate
RUN pnpm --filter @tracker/api build

WORKDIR /app/apps/api
EXPOSE 4000
CMD ["sh", "-c", "pnpm prisma:push && node dist/server.js"]
