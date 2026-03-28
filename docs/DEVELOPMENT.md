# Development Guide

This guide explains how to work in `leaf` without fighting the codebase or the test stack.

It is the implementation companion to:

- [Design Doc](./DESIGN.md)
- [User Journeys](./USER_JOURNEYS.md)
- [ADR Index](./adr/README.md)

Use this guide when adding features, updating UX backlog items, or changing tests.

This document is the primary source for day-to-day development and testing expectations.
ADRs provide design rationale and historical context, but they are not the main contributor workflow.

## Core Expectations

- Treat `DESIGN.md` and `USER_JOURNEYS.md` as product north stars.
- Keep `UX_REVIEW.md` aligned with shipped behavior and current gaps.
- Prefer durable architecture changes over test-only workarounds.
- Do not degrade UI semantics to satisfy a test harness.
- Keep demo mode useful for the primary account from one login.

## Repo Shape

- `apps/api`
  Fastify API, Prisma schema, route modules, and backend tests.
- `apps/web`
  React + Vite + Chakra app.
- `packages/shared`
  Shared Zod schemas and TypeScript contracts.
- `docs`
  Product docs, ADRs, engineering guidance, and testing notes.
- `e2e`
  Playwright browser workflows.

Relevant web structure:

- `apps/web/src/App.tsx`
  Shell and route orchestration only.
- `apps/web/src/pages/`
  Page-owned UI and page-specific composition.
- `apps/web/src/components/`
  Reusable shell and shared UI pieces.
- `apps/web/src/appTypes.ts`, `apps/web/src/appConstants.ts`, `apps/web/src/scheduleUtils.ts`
  Shared UI-facing domain helpers and types.

Relevant API structure:

- `apps/api/src/routes.ts`
  Route composition and shared route-level concerns.
- `apps/api/src/routes/setupAuth.ts`
  Setup, login, refresh, logout, OAuth.
- `apps/api/src/routes/userItems.ts`
  `/me`, `/members`, items, preferences.
- `apps/api/src/routes/guideAdmin.ts`
  Guide invite/admin flows.

## Development Workflow

When implementing a UX item:

1. Start with the product references.
   Read the matching sections in `docs/DESIGN.md`, `docs/USER_JOURNEYS.md`, and `UX_REVIEW.md`.
2. Find the actual shipped behavior.
   Inspect the relevant page module, API route, and shared contract before changing anything.
3. Keep domain and UI responsibilities separate.
   Extract shared logic out of page components when it starts carrying business rules.
4. Update demo data when the feature should be visible in demo mode.
   If the UX depends on meaningful seeded state, update `apps/api/src/demoSeed.ts`.
5. Add or update tests in the correct layer.
6. After the item is complete, add a short UX review note and remove the completed backlog item from `UX_REVIEW.md`.

## Source Control Workflow

Use structured git hygiene for all normal feature work.

### Branches

- Create feature work on branches named `feature/<well_named_feature>`.
- Prefer short, descriptive names based on the user-visible change or domain change.

Examples:

- `feature/unified-routines-flow`
- `feature/member-occurrence-actions`
- `feature/guide-relationship-editing`

### Commits

- Use conventional commits.
- Keep commit subjects short, imperative, and scoped to one coherent change.
- Prefer small commits that are reviewable on their own instead of one large dump.

Examples:

- `feat(web): unify recurring and one-time item creation`
- `fix(api): return 400 for invalid item update payloads`
- `test(e2e): add routines creation and edit coverage`
- `docs: document frontend test boundaries and workflow`

### Pull Requests

Open PRs with well-formed descriptions. At minimum, include:

- what problem the PR solves
- what changed
- how it was tested
- any follow-up work, risks, or known limits

Good PR descriptions should help a reviewer understand the user impact and verification path without rereading the entire diff first.

## Testing Strategy

This project uses layered testing. Do not push every behavior into the same test type.

If you are changing a feature, this section should tell you where the tests belong without requiring you to read an ADR first.

### Vitest and JSDOM

Use web Vitest tests for:

- pure domain logic
- rendering, loading, empty, and error states
- state and payload transitions that do not depend on real browser behavior
- route-level smoke coverage

Good candidates:

- schedule transformation helpers
- template resolution helpers
- page-level smoke tests
- deterministic UI logic that does not depend on portals, roving focus, or browser timing

Avoid putting these in JSDOM when they are interaction-heavy:

- complex radio or checkbox keyboard semantics
- dialog/popover/menu lifecycle behavior
- portal-heavy flows
- create/edit journeys that depend on real browser interaction timing

### API Integration Tests

Use API tests for:

- route contract verification
- validation behavior
- authentication and authorization
- ownership and visibility rules
- persistence semantics

When adding or changing a mutation route, cover:

- success path
- invalid payload
- auth required
- ownership/permission failure
- not found behavior when relevant

### Playwright

Use Playwright for high-value browser journeys where real integration matters.

Good candidates:

- first-run setup and login flows
- create/edit flows that redirect or update surrounding UI immediately
- portal/dialog/menu workflows
- permission-sensitive or date-sensitive journeys
- keyboard and accessibility semantics for repeated actions and custom-styled controls

Keep Playwright intentionally small and high-signal.

## Current Testing Commands

Before committing, run the baseline quality checks that protect the PR `quality` job on a clean runner:

```bash
pnpm lint
pnpm typecheck
```

If you changed a feature or route, also run the smallest relevant test slice locally before commit. If you are closing a UX iteration, run the full verification stack required by `UX_REVIEW.md`, not just a targeted subset.

Fast local checks:

```bash
pnpm --filter @leaf/web typecheck
pnpm --filter @leaf/web test
pnpm --filter @leaf/api exec vitest run test/routes.auth-guide.test.ts
```

Full browser-backed run:

```bash
pnpm test:e2e:docker
```

See also:

- [End-to-End Tests](./E2E.md)
- [Engineering Guardrails](./ENGINEERING_GUARDRAILS.md)
- [ADR-006: Frontend Test Boundaries](./adr/ADR-006-frontend-test-boundaries.md) for rationale and background on the current frontend test split

## UI and Accessibility Expectations

- Prefer correct native or accessible semantics first.
- Repeated actions need specific accessible names.
- Avoid ambiguous labels like bare `Edit`, `Open`, or `Save` when many are present.
- Prefer asserting by role and accessible name over brittle text matching.
- Do not swap radios, checkboxes, or switches for generic buttons just because tests are easier.

## Demo Mode Expectations

Demo mode is part of the development contract, not a throwaway seed path.

- Keep demo data current with visible product features.
- Prefer relative dates so demo activity stays meaningfully past, current, and future.
- Keep the seeded workspace useful from the original account alone.
- Add or update tests when demo mode is expected to expose the new feature.

## Documentation Expectations

When a change affects architecture, workflow, or long-term engineering policy:

- update `docs/README.md` if the document belongs in the normal reading path
- add or update an ADR if the decision is durable and project-wide
- update `UX_REVIEW.md` when the shipped UX changes or a backlog item is completed

Rule of thumb:

- put current contributor guidance and testing rules in this document
- use ADRs to explain why a durable decision was made
- do not make contributors reconstruct the expected workflow from ADRs alone

## Related Docs

- [Design Doc](./DESIGN.md)
- [User Journeys](./USER_JOURNEYS.md)
- [Engineering Guardrails](./ENGINEERING_GUARDRAILS.md)
- [End-to-End Tests](./E2E.md)
- [ADR-006: Frontend Test Boundaries](./adr/ADR-006-frontend-test-boundaries.md)
