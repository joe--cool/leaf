# Tracker Design Doc

## 1. Purpose

Tracker is an API-first, multi-user system for tracking completion of tasks such as homework, medicines/supplements, exercise, and other goals with flexible scheduling, reviewer visibility, notifications, and reporting.

This document is optimized for new contributors/agents to get productive quickly.

## 2. Original Product Requirements (from request)

1. Web app to track tasks/goals:
   - homework
   - medicines/supplements
   - exercise
   - other
2. Scheduling support:
   - one-time items
   - recurring schedules
   - irregular/custom schedules
3. Modern responsive UI:
   - desktop
   - iPad
   - iPhone
4. API-first architecture.
5. Tech preferences:
   - React + Vite + Chakra UI
   - TypeScript
6. CLI requirements:
   - login/authenticate
   - configurable host
   - clean/modern UX
7. macOS notifications app:
   - native mac notifications
   - configurable “hard to dismiss” behavior
   - per-event-type enable/disable
8. Weekly email digest:
   - configurable schedule
   - one or more recipients (self + reviewer context)
   - low-cost options (Gmail + local/dev options)
9. User model and roles:
   - multi-user from day one
   - user + reviewer relationships
   - users can invite reviewers
   - admins can configure reviewer mappings for anyone
10. First-install setup flow:
   - create first account/admin after install
11. Dockerized runnable stack:
   - docker compose instructions
   - image build instructions
12. Engineering quality:
   - tests
   - linting
   - static type checks
   - formatting
13. Open-source friendly licensing.

## 3. Current Architecture

Monorepo (pnpm workspaces):

- `apps/api`: Fastify + Prisma + PostgreSQL
- `apps/web`: React + Vite + Chakra UI
- `apps/cli`: TypeScript CLI
- `apps/mac-notifier`: macOS notifier daemon
- `packages/shared`: shared Zod schemas/types

Cross-cutting:

- TypeScript across all apps
- ESLint + Prettier + Vitest
- Docker Compose for local self-hosting

## 4. Domain Model

Core entities:

- `User`
- `UserRole` (`USER`, `ADMIN`)
- `ReviewerRelation` (reviewer -> reviewee)
- `TrackingItem` (schedule + notification settings)
- `TrackingCompletion`
- `Invite` (reviewer invite flow)
- `RefreshToken` (auth session rotation/revocation)

Schedule kinds:

- `ONE_TIME`
- `DAILY`
- `WEEKLY`
- `INTERVAL_DAYS`
- `CUSTOM_DATES`

## 5. Authentication and Setup

Supported auth:

1. Local email/password (default)
2. Optional OAuth/OIDC (Google, Apple) when provider env vars are configured

Session model:

- JWT access token
- refresh token rotation (`/auth/refresh`)
- logout revocation (`/auth/logout`)

First-run setup:

- `/setup/status` checks if setup is needed
- `/setup/first-admin` creates first admin only when user count = 0
- optional `SETUP_TOKEN` can gate first-admin creation

Bootstrap env mode (automation):

- optional auto bootstrap admin via env vars for scripted/demo scenarios

## 6. API-First Contract Areas

Key endpoint groups:

- Setup/auth:
  - `/setup/status`
  - `/setup/first-admin`
  - `/auth/register`
  - `/auth/login`
  - `/auth/refresh`
  - `/auth/logout`
  - `/auth/oauth/options`
  - `/auth/oauth/:provider/start`
  - `/auth/oauth/:provider/callback`
- User:
  - `/me`
  - `/me/preferences`
- Tracking:
  - `/items`
  - `/items/:id/complete`
  - `/validate/schedule`
- Reviewer/admin:
  - `/reviewers/invite`
  - `/reviewers/accept`
  - `/admin/users`
  - `/admin/reviewers`

## 7. UX Surfaces

### Web

Current capabilities:

- first-run setup form
- local login
- optional OAuth login buttons (if providers enabled)
- `/oauth/callback` handler route
- schedule editor across all schedule kinds
- item creation/listing
- reviewer invite flow
- admin reviewer mapping
- weekly digest preference editing

### CLI

Current capabilities:

- `login`
- `logout`
- `config set-host`
- `config show`
- `item:add`
- `items`
- automatic access-token refresh on 401 (using stored refresh token)

### macOS Notifier

Current behavior:

- polls API items
- sends native notifications via `terminal-notifier`
- repeats notifications for hard-to-dismiss items

## 8. Notifications and Reporting

Notifications:

- per-item enable/disable
- per-item hard-to-dismiss flag
- per-item repeat interval (minutes)
- macOS delivery via native Notification Center helper

Weekly digest:

- scheduled backend job
- includes user + review target summary
- delivery options:
  - Mailpit (dev)
  - Gmail App Password
  - generic SMTP

## 9. Deployment and Operations

Docker Compose provides:

- Postgres
- API
- Web
- Mailpit

Current compose bootstrapping behavior:

- DB readiness checks
- API waits on healthy DB
- schema sync on API startup (`prisma db push`)
- optional admin auto-bootstrap

LAN/hostname support:

- `WEB_ORIGIN` and `VITE_API_URL` can be supplied at compose runtime

## 10. Security Posture (Current)

Implemented:

- JWT auth
- refresh token rotation and revocation
- role checks on admin endpoints
- first-admin creation gated by empty DB (and optional setup token)
- helmet middleware
- global rate limit

Security notes:

- demo/bootstrap defaults are for local/dev convenience
- production should set strong secrets and explicit env configuration
- avoid exposing setup token in shared logs/channels

## 11. Quality Gates

Required checks:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`

CI:

- GitHub Actions runs lint/typecheck/test and Docker build checks

## 12. Open Source and License

- License: MIT
- Repo intended for open-source publication, with strong defaults and documented advanced configuration

## 13. Known Gaps / Next Iterations

1. Reviewer digest recipient customization (explicit multi-recipient settings UI)
2. More robust notification scheduling (due-calculation + completion-aware suppression)
3. E2E tests for complete first-run setup and OAuth callback flows
4. Optional stricter production setup mode (disable auto-bootstrap entirely)
5. CLI parity for reviewer/admin management commands

## 14. Contributor Onboarding Checklist

1. Read this file and `README.md`
2. Run stack via Docker quickstart
3. Verify setup/login/item/reviewer flows in web
4. Run lint/typecheck/tests locally
5. Before major changes, update shared schemas in `packages/shared`
6. Keep API-first: design endpoint contract before UI/CLI behavior
