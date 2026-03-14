# leaf

API-first multi-user leaf app for homework, meds/supplements, exercise, and recurring tasks.

## Highlights

- API-first architecture with shared TypeScript/Zod contracts
- Multi-user roles (`USER`, `ADMIN`) and reviewer relationships
- Flexible schedules (`ONE_TIME`, `DAILY`, `WEEKLY`, `INTERVAL_DAYS`, `CUSTOM_DATES`)
- Local auth by default with optional OAuth/OIDC (Google, Apple)
- Refresh-token rotation + logout revocation
- Web UI (React + Vite + Chakra), CLI, and macOS notifier
- Docker Compose quickstart with Postgres + Mailpit

## Repository Layout

- `apps/api` - Fastify + Prisma + PostgreSQL API
- `apps/web` - React + Vite + Chakra UI frontend
- `apps/cli` - TypeScript CLI
- `apps/mac-notifier` - macOS notification daemon (`terminal-notifier`)
- `packages/shared` - shared API schemas and types
- `docs` - design docs and ADRs

### Current code organization

- `apps/api/src/routes.ts` is now a thin composition layer; route domains live under `apps/api/src/routes/`
- `apps/api/src/routes/setupAuth.ts` owns setup, login, refresh, logout, and OAuth flows
- `apps/api/src/routes/userItems.ts` owns `/me`, `/reviewees`, items, and preference updates
- `apps/api/src/routes/reviewerAdmin.ts` owns reviewer invitations plus admin relationship/user management
- `apps/web/src/App.tsx` is now the application shell/orchestrator only
- `apps/web/src/pages/` contains page-level modules such as dashboard, profile, reviewees, routines, and admin
- `apps/web/src/components/` contains reusable shell/navigation/account UI pieces
- shared view models and schedule logic live in `apps/web/src/appTypes.ts`, `apps/web/src/appConstants.ts`, and `apps/web/src/scheduleUtils.ts`

## Quickstart (Docker)

Start the full stack:

```bash
docker compose up --build
```

Services:

- Web: http://localhost:8080
- API health: http://localhost:4000/health
- Mailpit: http://localhost:8025

### First-run modes

1. Secure first-run (recommended)

```bash
SETUP_TOKEN="$(openssl rand -hex 24)" && \
echo "Setup token: $SETUP_TOKEN" && \
AUTO_BOOTSTRAP_ADMIN=false SETUP_TOKEN="$SETUP_TOKEN" docker compose up --build
```

Use the printed token in the web Initial Setup form.

2. Bootstrap admin automatically (demo/automation)

```bash
AUTO_BOOTSTRAP_ADMIN=true \
BOOTSTRAP_ADMIN_EMAIL=admin@example.com \
BOOTSTRAP_ADMIN_PASSWORD=changeme123 \
docker compose up --build
```

3. First-run demo workspace

Start the stack in secure or bootstrap mode, then enable `Demo mode` in the web First-run Setup form when creating the first admin.

Demo mode creates:

- Sample routines for the new admin across multiple schedule types
- Additional fake users for admin and guide views
- Reviewer relationships in both directions, including active-guide and passive-guide examples from the original account
- Recent, overdue, due-today, and upcoming activity using dynamically generated relative dates
- Shared login password across the spoofed demo users so quick manual switching is possible when needed

Maintenance rule:

- When a new user-facing feature needs seeded data to be visible, update `apps/api/src/demoSeed.ts` and keep the seeded timestamps relative to the current date so the demo workspace remains useful over time.
- Preserve a single-account walkthrough: the original user should continue to land in member, active-guide, and passive-guide states without requiring account switching.

## Optional LAN/Hostname Access

Use runtime overrides (example hostname only):

```bash
WEB_ORIGIN=http://leaf-box.local:8080 \
VITE_API_URL=http://leaf-box.local:4000 \
docker compose up --build
```

Notes:

- Ensure `.local` hostname resolution works on your LAN (mDNS/Avahi).
- If firewall is enabled, allow `8080/tcp` and `4000/tcp`.

## Local Development (non-Docker)

Prerequisites:

- Node.js 24+
- pnpm 10+

Install and run core apps:

```bash
pnpm install
pnpm dev
```

Run all workspace apps:

```bash
pnpm dev:all
```

## Authentication

Default:

- Local email/password (`/auth/register`, `/auth/login`)
- Refresh token rotation (`/auth/refresh`)
- Logout revocation (`/auth/logout`)

Optional OAuth/OIDC providers:

- Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- Apple: `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET`, `APPLE_REDIRECT_URI`

Web callback route:

- `/oauth/callback`

## Email Delivery

- Docker default: Mailpit (no external provider required)
- Gmail option: `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `SMTP_FROM`
- Generic SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

## CLI Usage

```bash
pnpm --filter leaf-cli dev -- config set-host http://localhost:4000
pnpm --filter leaf-cli dev -- login --email admin@example.com --password 'your-password'
pnpm --filter leaf-cli dev -- items
```

## macOS Notifier

Install dependency:

```bash
brew install terminal-notifier
```

Run:

```bash
pnpm --filter @leaf/mac-notifier dev -- --host http://localhost:4000 --token <JWT>
```

## Operations

Build images manually:

```bash
docker build -f apps/api/Dockerfile -t leaf-api:local .
docker build -f apps/web/Dockerfile -t leaf-web:local .
```

Reset local stack/data:

```bash
docker compose down -v
docker compose up --build
```

Troubleshooting:

- API unhealthy: rebuild and restart (`docker compose up --build`)
- Postgres `locale: not found` warning on Alpine is expected in local dev

## Quality

```bash
pnpm lint
pnpm typecheck
pnpm test
```

CI:

- GitHub Actions runs lint, typecheck, tests, and Docker build checks
- Workflow: `.github/workflows/ci.yml`

## Documentation

- Design doc: `docs/DESIGN.md`
- ADRs: `docs/adr/`

## License

MIT (`LICENSE`)
