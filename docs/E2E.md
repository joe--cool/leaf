# End-to-End Tests

This repository uses a standard Playwright layout for browser-level end-to-end coverage:

- root config in `playwright.config.ts`
- specs in `e2e/`
- Docker-backed isolated stack for full-app flows

## Why this path exists

The reflection workflow now has route-level API coverage and mocked web coverage, but save failures can still hide in the gap between:

- built web app
- real Fastify API
- Prisma runtime
- Postgres schema state
- browser interaction timing

The Docker-backed Playwright path closes that gap for a small number of high-value workflows.

## Isolated Docker Run

Use:

```bash
pnpm test:e2e:docker
```

This uses:

- Compose project name: `leaf-e2e`
- compose files: `docker-compose.yml` + `docker-compose.e2e.yml`
- web port: `18080`
- API port: `14000`

That keeps the E2E stack separate from a local `docker compose up` using the default project and ports.

The Docker runner installs the Chromium browser automatically before starting the suite.
If the run fails, container logs are saved to:

- `test-results/e2e-docker/api.log`
- `test-results/e2e-docker/web.log`

If you want to do that once up front instead, run:

```bash
pnpm test:e2e:setup
```

## Local Playwright Run

If you already have the app stack running and want to point Playwright at it:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:18080 pnpm test:e2e
```

## Scope

Keep this suite intentionally small.

Good candidates:

- reflection creation and save flows
- auth/bootstrap journeys
- other workflows where mocked frontend tests are not enough

Avoid moving broad component coverage into E2E. Prefer API tests and app-level tests first, then add E2E only for flows where real integration matters.

## Authoring Rules

Write E2E specs around stable outcomes, not incidental copy.

Prefer:

- route changes such as `/retrospectives/:id`
- dialog visibility by role and accessible name
- labeled form controls
- explicit network mutations with successful responses
- specific accessible action names for repeated actions

Avoid:

- depending on the first matching `Open`, `Save`, or `Edit` control
- asserting decorative page copy unless the copy is the feature under test
- exact generated titles when a more durable outcome is available
- helpers that assume only one valid app state

For this repo specifically:

- keep one dedicated bootstrap flow for first-run setup
- all normal workflow tests should use a returning-user login helper
- repeated actions should use labels like `Open reflection for Jordan Ellis`
- create flows should usually assert both:
  - the mutation response succeeds
  - the browser lands on the new detail route

Recommended structure:

- one serial bootstrap test that provisions the workspace
- helper-based sign-in for the rest of the suite
- only the bootstrap test should depend on first-run setup UI

Good post-create assertions:

- summary field is visible
- detail route is loaded
- a durable identity string such as `Created by ...` is visible

Less reliable assertions:

- exact hero copy
- duplicated headings
- the first matching action in a card list
