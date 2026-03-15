# leaf

API-first multi-user leaf app for homework, meds/supplements, exercise, and recurring tasks.

## Highlights

- API-first architecture with shared TypeScript/Zod contracts
- Multi-user roles (`USER`, `ADMIN`) and guide relationships
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
- `apps/api/src/routes/userItems.ts` owns `/me`, `/members`, items, and preference updates
- `apps/api/src/routes/guideAdmin.ts` owns guide invitations plus admin relationship/user management
- `apps/web/src/App.tsx` is now the application shell/orchestrator only
- `apps/web/src/pages/` contains page-level modules such as dashboard, profile, members, routines, and admin
- `apps/web/src/components/` contains reusable shell/navigation/account UI pieces
- shared view models and schedule logic live in `apps/web/src/appTypes.ts`, `apps/web/src/appConstants.ts`, and `apps/web/src/scheduleUtils.ts`

## Quickstart

If you want the simplest path, use the included start/stop scripts. They run the app with Docker and print the important URLs for you.

### Before you start

- Install Docker Desktop if you are on macOS or Windows.
- Install Docker Engine and Docker Compose if you are on Linux.
- Make sure Docker is running before you continue.

### Fastest first run

On macOS or Linux:

```bash
./start-local.sh
```

On Windows PowerShell:

```powershell
.\start-local.ps1
```

Then open:

- Web app: http://localhost:8080
- API health check: http://localhost:4000/health
- Mailpit inbox for test emails: http://localhost:8025

The startup script will print a setup token if one is needed. Copy that token into the Initial Setup screen in the browser.

### Recommended first experience: Demo mode

If you want to get a feel for the product before setting up your real data, turn on `Demo mode` during the Initial Setup flow in the browser.

Demo mode creates:

- Sample routines
- Example users and guide relationships
- Recent and upcoming activity so the app feels populated immediately

This is the best option for a first look.

### If you want to share it on your local network

On macOS or Linux:

```bash
./start-local.sh --lan
```

On Windows PowerShell:

```powershell
.\start-local.ps1 -Lan
```

This makes the app use your machine's `.local` hostname when your network supports it.

### How to stop it

On macOS or Linux:

```bash
./stop-local.sh
```

On Windows PowerShell:

```powershell
.\stop-local.ps1
```

This stops the containers but keeps your saved local data, including the database, so you can start again later and pick up where you left off.

### How to start over from scratch

If you want a completely fresh reset, stop the stack with the `volumes` flag.

On macOS or Linux:

```bash
./stop-local.sh --volumes
```

On Windows PowerShell:

```powershell
.\stop-local.ps1 -Volumes
```

This deletes the Docker volumes used by the app. In practice, that means your local database and other persisted local data are removed, so the next start behaves like a brand-new install.

Use this if:

- You want to redo Initial Setup
- You want to clear demo data and begin again
- You want a clean local reset for troubleshooting

Do not use this if you want to keep your current local data.

### Manual Docker startup

If you prefer raw Docker commands instead of the helper scripts:

1. Secure first-run

```bash
SETUP_TOKEN="$(openssl rand -hex 24)" && \
echo "Setup token: $SETUP_TOKEN" && \
AUTO_BOOTSTRAP_ADMIN=false SETUP_TOKEN="$SETUP_TOKEN" docker compose up --build
```

2. Bootstrap admin automatically

```bash
AUTO_BOOTSTRAP_ADMIN=true \
BOOTSTRAP_ADMIN_EMAIL=admin@example.com \
BOOTSTRAP_ADMIN_PASSWORD=changeme123 \
docker compose up --build
```

When using the manual Docker path, you can still enable `Demo mode` during the Initial Setup flow in the browser.

## Repo Start/Stop Scripts

The repo includes helper scripts for local Docker usage:

```bash
./start-local.sh
./stop-local.sh
```

Windows PowerShell equivalents:

```powershell
.\start-local.ps1
.\stop-local.ps1
```

By default `./start-local.sh` configures the stack for local-only access on `localhost`.

By default `.\start-local.ps1` does the same on Windows.

To advertise the machine on your local network using its detected `.local` hostname and open tagged `ufw` rules:

```bash
./start-local.sh --lan
```

The hostname comes from `HOSTNAME_LOCAL`, then `HOSTNAME`, then `hostname`.

Help:

```bash
./start-local.sh --help
./stop-local.sh --help
```

```powershell
.\start-local.ps1 -Help
.\stop-local.ps1 -Help
```

Use `./stop-local.sh --volumes` if you also want to remove Docker volumes.
Use `.\stop-local.ps1 -Volumes` for the same reset on Windows.

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

Focused browser E2E against an isolated Docker stack:

```bash
pnpm test:e2e:docker
```

Details:

- [docs/E2E.md](/home/adillow/git-repos/tracker/docs/E2E.md)
- [docs/ENGINEERING_GUARDRAILS.md](/home/adillow/git-repos/tracker/docs/ENGINEERING_GUARDRAILS.md)

CI:

- GitHub Actions runs lint, typecheck, tests, and Docker build checks
- Workflow: `.github/workflows/ci.yml`

## Documentation

- Design doc: `docs/DESIGN.md`
- Engineering guardrails: `docs/ENGINEERING_GUARDRAILS.md`
- ADRs: `docs/adr/`

## License

MIT (`LICENSE`)
